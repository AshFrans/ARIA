import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import Groq from 'groq-sdk';
import { buildHandlers, getEnabledDeclarations } from '../integrations';
import DatePickerCard from './DatePickerCard';
import { spacing, fontSize, radius } from '../theme';

const DATE_PICKER_TOOL = {
  type: 'function',
  function: {
    name: 'show_date_picker',
    description: 'Show an interactive date picker to the user whenever a specific date needs to be chosen — scheduling, deadlines, events, reminders, or any task requiring a date input. Always call this instead of asking the user to type a date.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Short question shown above the picker, e.g. "Which date should I set the deadline for?"',
        },
      },
      required: ['prompt'],
    },
  },
};

// Parse the retry-after delay (seconds) from a Gemini 429 error message
function parseRetryDelay(message) {
  const match = message?.match(/retry[^\d]*(\d+)/i);
  return match ? parseInt(match[1], 10) : 30;
}

// Exponential backoff with jitter, respects Retry-After hint from API
async function withRetry(fn, maxAttempts = 3) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      const is429 = e.message?.includes('429') || e.status === 429;
      if (!is429 || attempt >= maxAttempts) throw e;
      const hinted = parseRetryDelay(e.message);
      const delay = Math.max(hinted * 1000, Math.min(2 ** attempt * 2000, 60000));
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

const MODEL = 'llama-3.3-70b-versatile';
const MODEL_CONTEXT = 128000;

function tokenBarColor(tokens, colors) {
  const pct = tokens / MODEL_CONTEXT;
  if (pct > 0.9) return colors.danger;
  if (pct > 0.7) return colors.warning;
  return colors.success;
}

function buildSystemPrompt({ ariaName, personality, activeTab, todayHours, currentEntry, todos, noteSnippet }) {
  const name = ariaName || 'Aria';
  const parts = [
    `You are ${name}, a warm, sharp, and efficient personal assistant. You know the user's day — their tracked hours, open todos, and today's notes — before they say a word. You are proactive, concise, and always helpful. When you use a function, report the result naturally without narrating the call.`,
  ];
  if (personality) parts.push(`\nPersonality: ${personality}`);
  parts.push(`\nActive tab: ${activeTab || 'Work'}`);
  if (activeTab === 'Work' && todayHours !== undefined) {
    parts.push(`Work hours today: ${todayHours}h.`);
    if (currentEntry) parts.push(`Running timer: "${currentEntry.description}" on "${currentEntry.project}" — ${currentEntry.elapsed}.`);
    else parts.push('No timer running.');
  }
  if (todos?.length) {
    const open = todos.filter(t => !t.completed);
    parts.push(`\nOpen ${activeTab} todos: ${open.map(t => t.text).join(', ') || 'none'}`);
  }
  if (noteSnippet) parts.push(`\nToday's note snippet:\n${noteSnippet.slice(0, 400)}`);
  return parts.join('\n');
}

export default function ChatPanel({
  settings,
  activeTab,
  context,   // { todayHours, currentEntry, todos, noteSnippet }
  colors,
  style,
  onToolExecuted,
}) {
  const [messages, setMessages] = useState([]);  // { id, role, text }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [lastUsage, setLastUsage] = useState(null); // { prompt_tokens, completion_tokens, total_tokens }
  const [datePickerState, setDatePickerState] = useState(null); // { prompt } | null
  const datePickerResolverRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const retryTimerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const recordingRef = useRef(null);
  const recognitionRef = useRef(null);
  const sendMessageRef = useRef(null); // always points to latest sendMessage

  const apiKey = settings?.groq_api_key;
  const ariaName = settings?.aria_name || 'Aria';

  // Scroll to top whenever new messages arrive (list is inverted)
  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
  }, [messages]);

  // Clean up retry timer and any active recording on unmount
  useEffect(() => () => {
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
    recognitionRef.current?.stop();
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
  }, []);

  // Greet on first load
  useEffect(() => {
    if (!apiKey) {
      setMessages([{
        id: '0',
        role: 'model',
        text: `Hi! I'm ${ariaName}. I need a Groq API key to get started — please head to Settings (gear icon) to add one.`,
      }]);
      return;
    }
    setMessages([{
      id: '0',
      role: 'model',
      text: `Hi! I'm ${ariaName}. I'm aware of your ${activeTab} context — ask me anything, or ask me to manage your todos and notes.`,
    }]);
  }, [apiKey, ariaName]);

  // Pause the agentic loop until the user picks a date; resolves with ISO string or null (cancelled)
  const awaitDatePicker = (prompt) => new Promise((resolve) => {
    datePickerResolverRef.current = resolve;
    setDatePickerState({ prompt });
  });

  const handleDateConfirm = (iso) => {
    setDatePickerState(null);
    datePickerResolverRef.current?.(iso);
    datePickerResolverRef.current = null;
  };

  const handleDateCancel = () => {
    setDatePickerState(null);
    datePickerResolverRef.current?.(null);
    datePickerResolverRef.current = null;
  };

  // sendMessage optionally accepts a text string to send directly (used by voice auto-send)
  const sendMessage = useCallback(async (textOverride) => {
    const text = textOverride !== undefined ? textOverride.trim() : input.trim();
    if (!text) return;
    if (!apiKey) return;

    const userMsg = { id: String(Date.now()), role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    if (textOverride === undefined) setInput('');
    setLoading(true);

    try {
      const systemPrompt = buildSystemPrompt({
        ariaName: settings?.aria_name,
        personality: settings?.aria_personality,
        activeTab,
        todayHours: context?.todayHours,
        currentEntry: context?.currentEntry,
        todos: context?.todos,
        noteSnippet: context?.noteSnippet,
      });

      const tools = [...getEnabledDeclarations({ settings, activeTab }), DATE_PICKER_TOOL];
      const handlers = buildHandlers({ settings, activeTab });

      // Build OpenAI-format message history
      const groqMessages = [
        { role: 'system', content: systemPrompt },
        // Skip greeting (index 0), map history to OpenAI roles
        ...messages.slice(1).map(m => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.text || '',
        })),
        { role: 'user', content: text },
      ];

      // Insert streaming placeholder bubble immediately
      const replyId = String(Date.now() + 1);
      setMessages(prev => [...prev, { id: replyId, role: 'model', text: '' }]);
      setLoading(false);

      const updateBubble = (txt) =>
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: txt } : m));

      try {
        const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

        let accumulated = '';
        let iters = 0;

        // Agentic loop: stream → execute tools → stream again until no more tool calls
        while (iters < 5) {
          iters++;
          const stream = await groq.chat.completions.create({
            model: MODEL,
            messages: groqMessages,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? 'auto' : undefined,
            stream: true,
            stream_options: { include_usage: true },
          });

          accumulated = '';
          const pendingToolCalls = {}; // index → { id, name, arguments }

          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            if (chunk.usage) setLastUsage(chunk.usage);

            // Accumulate text
            if (delta?.content) {
              accumulated += delta.content;
              updateBubble(accumulated);
            }

            // Accumulate tool call deltas (streamed in pieces)
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                if (!pendingToolCalls[tc.index]) {
                  pendingToolCalls[tc.index] = { id: tc.id || '', name: '', arguments: '' };
                }
                if (tc.id) pendingToolCalls[tc.index].id = tc.id;
                if (tc.function?.name) pendingToolCalls[tc.index].name += tc.function.name;
                if (tc.function?.arguments) pendingToolCalls[tc.index].arguments += tc.function.arguments;
              }
            }
          }

          const toolCallList = Object.values(pendingToolCalls);
          if (toolCallList.length === 0) break; // no tools — we're done

          // Show activity indicator while executing tools
          if (!accumulated) updateBubble('…');

          // Add assistant message with tool_calls to history
          groqMessages.push({
            role: 'assistant',
            content: accumulated || null,
            tool_calls: toolCallList.map(tc => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });

          // Execute each tool and add responses to history
          let anyToolSucceeded = false;
          for (const tc of toolCallList) {
            let result;
            try {
              const args = JSON.parse(tc.arguments || '{}');
              if (tc.name === 'show_date_picker') {
                const iso = await awaitDatePicker(args.prompt || 'Select a date');
                if (iso) {
                  const formatted = new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  });
                  result = { selected_date: iso, formatted };
                  anyToolSucceeded = true;
                } else {
                  result = { cancelled: true };
                }
              } else {
                result = handlers[tc.name]
                  ? await handlers[tc.name](args)
                  : { error: `Unknown function: ${tc.name}` };
                if (!result?.error) anyToolSucceeded = true;
              }
            } catch (fnErr) {
              result = { error: fnErr.message };
            }
            groqMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
          if (anyToolSucceeded) onToolExecuted?.();
          // Loop continues → stream Aria's follow-up reply
        }

        if (!accumulated) updateBubble('(No response — please try again)');
      } catch (e) {
        const is429 = e.status === 429 || e.message?.includes('429');
        if (is429) {
          const delay = parseRetryDelay(e.message);
          setRetryCountdown(delay);
          if (retryTimerRef.current) clearInterval(retryTimerRef.current);
          retryTimerRef.current = setInterval(() => {
            setRetryCountdown(prev => {
              if (prev <= 1) { clearInterval(retryTimerRef.current); return 0; }
              return prev - 1;
            });
          }, 1000);
          updateBubble(`Rate limited — ready in ${delay}s. Please resend your message.`);
        } else {
          updateBubble(`Sorry, something went wrong: ${e.message}`);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [input, messages, apiKey, settings, activeTab, context]);

  // Keep ref current so voice event handlers always call the latest version
  useEffect(() => { sendMessageRef.current = sendMessage; }, [sendMessage]);

  const transcribeAudio = async (uri) => {
    const formData = new FormData();
    formData.append('file', { uri, type: 'audio/m4a', name: 'recording.m4a' });
    formData.append('model', 'whisper-large-v3');
    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Transcription error ${res.status}`);
    const data = await res.json();
    return data.text?.trim() || '';
  };

  const toggleVoice = useCallback(async () => {
    if (Platform.OS === 'web') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { alert('Speech recognition is not supported in this browser.'); return; }

      if (isRecording) {
        recognitionRef.current?.stop();
        return; // onend handles the rest
      }

      const recognition = new SR();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      let finalText = '';

      recognition.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            finalText += e.results[i][0].transcript;
          } else {
            interim += e.results[i][0].transcript;
          }
        }
        setInput(finalText + interim);
      };

      recognition.onend = () => {
        setIsRecording(false);
        const text = finalText.trim();
        if (text) {
          setInput('');
          sendMessageRef.current(text);
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
        setInput('');
      };

      recognition.start();
      setIsRecording(true);
    } else {
      if (isRecording) {
        setIsRecording(false);
        const rec = recordingRef.current;
        if (!rec) return;
        try {
          await rec.stopAndUnloadAsync();
          await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
          const uri = rec.getURI();
          recordingRef.current = null;
          if (uri && apiKey) {
            setIsTranscribing(true);
            try {
              const transcript = await transcribeAudio(uri);
              if (transcript) {
                setInput('');
                sendMessageRef.current(transcript);
              }
            } finally {
              setIsTranscribing(false);
            }
          }
        } catch (e) {
          console.error('Stop recording error:', e);
          setIsTranscribing(false);
        }
      } else {
        try {
          const { status } = await Audio.requestPermissionsAsync();
          if (status !== 'granted') return;
          await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
          const { recording } = await Audio.Recording.createAsync({
            android: {
              extension: '.m4a',
              outputFormat: Audio.AndroidOutputFormat.MPEG_4,
              audioEncoder: Audio.AndroidAudioEncoder.AAC,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
            },
            ios: {
              extension: '.m4a',
              outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
              audioQuality: Audio.IOSAudioQuality.MEDIUM,
              sampleRate: 16000,
              numberOfChannels: 1,
              bitRate: 128000,
              linearPCMBitDepth: 16,
              linearPCMIsBigEndian: false,
              linearPCMIsFloat: false,
            },
            web: { mimeType: 'audio/webm', bitsPerSecond: 128000 },
          });
          recordingRef.current = recording;
          setIsRecording(true);
        } catch (e) {
          console.error('Start recording error:', e);
        }
      }
    }
  }, [isRecording, apiKey]);

  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
            <Text style={styles.avatarText}>{ariaName[0]}</Text>
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? [styles.bubbleUser, { backgroundColor: colors.chatBubbleUser }]
            : [styles.bubbleAria, { backgroundColor: colors.chatBubbleAria }],
        ]}>
          <Text style={[styles.bubbleText, { color: isUser ? colors.chatTextUser : colors.chatTextAria }]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.surface }, style]}
    >
      {/* Header */}
      <View style={[styles.panelHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.text }]}>Chat with {ariaName}</Text>
      </View>

      {/* Token / rate-limit status bar */}
      {(lastUsage || retryCountdown > 0) && (
        <View style={[styles.tokenBarOuter, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.tokenBarTrack, { backgroundColor: colors.border }]}>
            {retryCountdown > 0 ? (
              <View style={[styles.tokenBarFill, { width: '100%', backgroundColor: colors.danger }]} />
            ) : (
              <View style={[styles.tokenBarFill, {
                width: `${Math.min((lastUsage.total_tokens / MODEL_CONTEXT) * 100, 100)}%`,
                backgroundColor: tokenBarColor(lastUsage.total_tokens, colors),
              }]} />
            )}
          </View>
          <Text style={[styles.tokenBarLabel, { color: retryCountdown > 0 ? colors.danger : colors.textTertiary }]}>
            {retryCountdown > 0
              ? `rate limited — ${retryCountdown}s`
              : `${lastUsage.total_tokens.toLocaleString()} / 128k ctx`}
          </Text>
        </View>
      )}

      {/* Input row */}
      <View style={[styles.inputRow, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={toggleVoice} style={styles.iconBtn} disabled={isTranscribing}>
          {isTranscribing
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Text style={[styles.micIcon, isRecording && { color: colors.danger }]}>🎤</Text>
          }
        </TouchableOpacity>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt }]}
          placeholder={`Message ${ariaName}…`}
          placeholderTextColor={colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault?.();
              sendMessage();
            }
          }}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.accent : colors.textTertiary }]}
          onPress={sendMessage}
          disabled={loading || !input.trim()}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>

      {/* Date picker — shown inline when ARIA needs a date */}
      {datePickerState && (
        <DatePickerCard
          prompt={datePickerState.prompt}
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
          colors={colors}
          ariaName={ariaName}
        />
      )}

      {/* Messages — newest first */}
      <FlatList
        ref={listRef}
        data={[...messages].reverse()}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.messageList}
      />

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.typingText, { color: colors.textSecondary }]}>{ariaName} is thinking…</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  panelTitle: { fontSize: fontSize.md, fontWeight: '700' },
  messageList: { padding: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.sm },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  avatar: { width: 28, height: 28, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, padding: spacing.sm + 2 },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAria: { borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  bubbleText: { fontSize: fontSize.sm, lineHeight: 20 },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  typingText: { fontSize: fontSize.xs, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs },
  iconBtn: { padding: spacing.xs, paddingBottom: spacing.sm },
  micIcon: { fontSize: 20 },
  input: { flex: 1, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: Platform.OS === 'web' ? spacing.sm : spacing.xs, fontSize: fontSize.sm, maxHeight: 100, minHeight: 38 },
  tokenBarOuter: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: 3, borderBottomWidth: StyleSheet.hairlineWidth },
  tokenBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  tokenBarFill: { height: '100%', borderRadius: 2 },
  tokenBarLabel: { fontSize: 9, letterSpacing: 0.3 },
  sendBtn: { width: 38, height: 38, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: '700', lineHeight: 20 },
});
