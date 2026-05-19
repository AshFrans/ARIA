import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Image,
} from 'react-native';
import { spacing, fontSize, radius } from '../theme';

const ARIA_REPO = 'AshFrans/ARIA';
const ARIA_ISSUES_API = `https://api.github.com/repos/${ARIA_REPO}/issues`;

export default function BugReportModal({ visible, onClose, colors, settings, screenshotDataUrl }) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (visible) {
      setDescription('');
      setResult(null);
    }
  }, [visible]);

  const getToken = () => settings?.work_github_token || settings?.personal_github_token || null;

  const downloadScreenshot = () => {
    if (!screenshotDataUrl || Platform.OS !== 'web') return;
    const a = document.createElement('a');
    a.href = screenshotDataUrl;
    a.download = `aria-bug-${Date.now()}.png`;
    a.click();
  };

  const buildIssueBody = () => {
    const sysInfo = Platform.OS === 'web'
      ? `**Browser:** ${navigator.userAgent.slice(0, 120)}\n**Screen:** ${window.screen.width}×${window.screen.height}`
      : `**Platform:** ${Platform.OS}`;
    return [
      '## Description',
      description.trim(),
      '',
      '## System Info',
      sysInfo,
      '',
      '---',
      '*Reported via ARIA in-app bug reporter.*',
      screenshotDataUrl ? '_Screenshot attached — drag it into this issue._' : '',
    ].join('\n').trim();
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);

    const title = `Bug: ${description.trim().slice(0, 72)}${description.length > 72 ? '…' : ''}`;
    const body = buildIssueBody();
    const token = getToken();

    try {
      if (token) {
        const res = await fetch(ARIA_ISSUES_API, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, body, labels: ['bug'] }),
        });

        if (res.ok) {
          const issue = await res.json();
          downloadScreenshot();
          // Open the issue so the user can drag in the screenshot
          if (Platform.OS === 'web') window.open(issue.html_url, '_blank');
          setResult({ ok: true, issueUrl: issue.html_url });
          setSubmitting(false);
          return;
        }
      }
    } catch (_) {}

    // Fallback: open GitHub new-issue URL pre-filled
    if (Platform.OS === 'web') {
      const params = new URLSearchParams({ title, body });
      window.open(`https://github.com/${ARIA_REPO}/issues/new?${params}`, '_blank');
      downloadScreenshot();
      setResult({ ok: true, issueUrl: `https://github.com/${ARIA_REPO}/issues` });
    } else {
      setResult({ ok: false, error: 'Could not submit. Please report at github.com/' + ARIA_REPO });
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>Report a Bug</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {screenshotDataUrl && (
              <View style={styles.screenshotWrap}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Screenshot captured automatically</Text>
                <Image
                  source={{ uri: screenshotDataUrl }}
                  style={[styles.screenshot, { borderColor: colors.border }]}
                  resizeMode="contain"
                />
              </View>
            )}

            {!result ? (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>What happened?</Text>
                <TextInput
                  style={[styles.input, {
                    color: colors.text,
                    backgroundColor: colors.surfaceAlt,
                    borderColor: description.trim() ? colors.accent : colors.border,
                  }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe what you were doing and what went wrong…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={5}
                  autoFocus
                />

                <TouchableOpacity
                  style={[styles.submitBtn, {
                    backgroundColor: description.trim() && !submitting ? colors.accent : colors.textTertiary,
                  }]}
                  onPress={handleSubmit}
                  disabled={!description.trim() || submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.submitBtnText}>Submit Report</Text>}
                </TouchableOpacity>
              </>
            ) : result.ok ? (
              <View style={styles.successBox}>
                <Text style={[styles.successIcon]}>✓</Text>
                <Text style={[styles.successText, { color: colors.success }]}>Report submitted!</Text>
                {screenshotDataUrl && (
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Your screenshot was downloaded. Open the issue and drag it in to attach it.
                  </Text>
                )}
                {result.issueUrl && Platform.OS === 'web' && (
                  <TouchableOpacity onPress={() => window.open(result.issueUrl, '_blank')}>
                    <Text style={[styles.issueLink, { color: colors.accent }]}>View issue on GitHub ↗</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.doneBtn, { borderColor: colors.border }]}
                  onPress={onClose}
                >
                  <Text style={[styles.doneBtnText, { color: colors.text }]}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.hint, { color: colors.danger }]}>{result.error}</Text>
                <TouchableOpacity onPress={() => setResult(null)} style={styles.doneBtn}>
                  <Text style={[styles.doneBtnText, { color: colors.accent }]}>Try again</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 8px 32px rgba(0,0,0,0.25)' },
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16 },
      android: { elevation: 12 },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { flex: 1, fontSize: fontSize.lg, fontWeight: '700' },
  closeBtn: { padding: spacing.xs },
  closeText: { fontSize: 18, fontWeight: '600' },
  body: { padding: spacing.md, gap: spacing.sm },
  screenshotWrap: { marginBottom: spacing.sm },
  label: { fontSize: fontSize.xs, fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  screenshot: {
    width: '100%',
    height: 160,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: '#000',
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: fontSize.sm,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  submitBtn: {
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  successBox: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  successIcon: { fontSize: 36, color: '#22c55e' },
  successText: { fontSize: fontSize.lg, fontWeight: '700' },
  hint: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  issueLink: { fontSize: fontSize.sm, fontWeight: '600', marginTop: spacing.xs },
  doneBtn: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  doneBtnText: { fontSize: fontSize.sm, fontWeight: '600' },
});
