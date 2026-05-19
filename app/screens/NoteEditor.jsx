import React, { useState, useEffect, useCallback } from 'react';
import {
  View, TextInput, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView,
} from 'react-native';
import { createGitHubClient } from '../lib/github';
import { todayPath, formatNoteDate, currentTimeLabel } from '../lib/markdown';
import { spacing, fontSize, radius } from '../theme';

const notePath = () => `notes/${todayPath()}.md`;

export default function NoteEditor({ githubConfig, tab, colors, onClose }) {
  const [content, setContent] = useState('');
  const [sha, setSha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);

  const gh = githubConfig ? createGitHubClient(githubConfig) : null;
  const path = notePath();

  const load = useCallback(async () => {
    if (!gh) { setError('GitHub not configured.'); setLoading(false); return; }
    try {
      const file = await gh.getFile(path);
      if (file) {
        setContent(file.content);
        setSha(file.sha);
      } else {
        const initial = `# Notes — ${formatNoteDate()}\n\n`;
        setContent(initial);
        setSha(null);
      }
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!gh || !dirty) return;
    setSaving(true);
    try {
      const result = await gh.putFile(path, content, sha, `Update ${tab} note for ${todayPath()} via Aria`);
      setSha(result.content.sha);
      setDirty(false);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const appendEntry = async () => {
    const time = currentTimeLabel();
    const addition = `\n## ${time}\n`;
    setContent(c => c + addition);
    setDirty(true);
  };

  const handleChange = (text) => {
    setContent(text);
    setDirty(true);
  };

  const githubUrl = githubConfig
    ? `https://github.com/${githubConfig.owner}/${githubConfig.repo}/blob/HEAD/${path}`
    : null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{tab} Notes</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{formatNoteDate()}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={appendEntry} style={styles.headerBtn}>
              <Text style={[styles.headerBtnText, { color: colors.accent }]}>+ Entry</Text>
            </TouchableOpacity>
            {githubUrl && (
              <TouchableOpacity onPress={() => { const { Linking } = require('react-native'); Linking.openURL(githubUrl); }}>
                <Text style={[styles.headerBtnText, { color: colors.textSecondary }]}>GitHub ↗</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={save}
              style={[styles.saveBtn, { backgroundColor: dirty ? colors.accent : colors.textTertiary }]}
              disabled={!dirty || saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

        {loading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          <TextInput
            style={[styles.editor, { color: colors.text, backgroundColor: colors.background }]}
            value={content}
            onChangeText={handleChange}
            multiline
            textAlignVertical="top"
            autoCorrect
            spellCheck
            scrollEnabled
            placeholder={`# Notes — ${formatNoteDate()}\n\nStart writing…`}
            placeholderTextColor={colors.textTertiary}
            fontFamily={Platform.OS === 'ios' ? 'Courier' : 'monospace'}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  backBtn: { padding: spacing.xs },
  backText: { fontSize: fontSize.sm, fontWeight: '600' },
  title: { fontSize: fontSize.md, fontWeight: '700' },
  subtitle: { fontSize: fontSize.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerBtn: { padding: spacing.xs },
  headerBtnText: { fontSize: fontSize.sm, fontWeight: '600' },
  saveBtn: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 5 },
  saveBtnText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  editor: { flex: 1, padding: spacing.md, fontSize: fontSize.sm, lineHeight: 24 },
  error: { padding: spacing.sm, fontSize: fontSize.xs },
});
