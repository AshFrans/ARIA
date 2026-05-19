import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Image,
} from 'react-native';
import { spacing, fontSize, radius } from '../theme';

const ARIA_REPO = 'AshFrans/ARIA-issues';
const ARIA_ISSUES_API = `https://api.github.com/repos/${ARIA_REPO}/issues`;
const GH_API = 'https://api.github.com';

// Upload PNG (data URL) to the user's repo and return the raw download URL
async function uploadScreenshot(dataUrl, token, owner, repo) {
  const base64 = dataUrl.split(',')[1];
  const path = `bug-screenshots/${Date.now()}.png`;
  const res = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'Add bug report screenshot', content: base64 }),
  });
  if (!res.ok) throw new Error('screenshot upload failed');
  const data = await res.json();
  return data.content.download_url;
}

function buildBody(description, screenshotUrl) {
  const sysInfo = Platform.OS === 'web'
    ? `**Browser:** ${navigator.userAgent.slice(0, 120)}\n**Screen:** ${window.screen.width}×${window.screen.height}`
    : `**Platform:** ${Platform.OS}`;

  const lines = [
    '## Description',
    description.trim(),
    '',
    '## System Info',
    sysInfo,
  ];

  if (screenshotUrl) {
    lines.push('', '## Screenshot', `![Screenshot](${screenshotUrl})`);
  }

  lines.push('', '---', '*Reported via ARIA in-app bug reporter.*');
  return lines.join('\n');
}

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

  // Pick the first available GitHub config that has all three fields
  const getGitHubConfig = () => {
    const configs = [
      { token: settings?.work_github_token, owner: settings?.work_github_owner, repo: settings?.work_github_repo },
      { token: settings?.personal_github_token, owner: settings?.personal_github_owner, repo: settings?.personal_github_repo },
    ];
    return configs.find(c => c.token?.trim() && c.owner?.trim() && c.repo?.trim()) || null;
  };

  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);

    const title = `Bug: ${description.trim().slice(0, 72)}${description.length > 72 ? '…' : ''}`;
    const ghConfig = getGitHubConfig();

    try {
      // Step 1: upload screenshot to the user's repo so it gets a public raw URL
      let screenshotUrl = null;
      if (screenshotDataUrl && ghConfig) {
        try {
          screenshotUrl = await uploadScreenshot(
            screenshotDataUrl,
            ghConfig.token,
            ghConfig.owner,
            ghConfig.repo,
          );
        } catch (_) {
          // Non-fatal — still submit the issue without a screenshot
        }
      }

      const body = buildBody(description, screenshotUrl);

      // Step 2: create issue on AshFrans/ARIA
      if (ghConfig) {
        const res = await fetch(ARIA_ISSUES_API, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${ghConfig.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title, body, labels: ['bug'] }),
        });

        if (res.ok) {
          const issue = await res.json();
          if (Platform.OS === 'web') window.open(issue.html_url, '_blank');
          setResult({ ok: true, issueUrl: issue.html_url });
          setSubmitting(false);
          return;
        }
      }

      // Fallback: open GitHub new-issue page pre-filled in the browser
      if (Platform.OS === 'web') {
        const params = new URLSearchParams({ title, body });
        window.open(`https://github.com/${ARIA_REPO}/issues/new?${params}`, '_blank');
        setResult({ ok: true, issueUrl: `https://github.com/${ARIA_REPO}/issues` });
      } else {
        setResult({ ok: false, error: `Please report at github.com/${ARIA_REPO}` });
      }
    } catch (e) {
      setResult({ ok: false, error: e.message });
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
                <Text style={styles.successIcon}>✓</Text>
                <Text style={[styles.successText, { color: colors.success }]}>Report submitted!</Text>
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
              <View style={styles.successBox}>
                <Text style={[styles.hint, { color: colors.danger }]}>{result.error}</Text>
                <TouchableOpacity onPress={() => setResult(null)} style={[styles.doneBtn, { borderColor: colors.border }]}>
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
