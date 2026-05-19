import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Linking, Alert, ActivityIndicator, SafeAreaView, Platform,
} from 'react-native';
import { storage } from '../lib/storage';
import { createGitHubClient } from '../lib/github';
import { spacing, fontSize, radius, THEME_META } from '../theme';

const FIELDS = {
  aria: [
    { key: 'aria_name', label: 'Assistant Name', placeholder: 'Aria', secure: false },
    { key: 'aria_personality', label: 'Personality Description', placeholder: 'Warm, sharp, and efficient', secure: false, multiline: true },
  ],
  work: [
    { key: 'groq_api_key', label: 'Groq API Key', placeholder: 'gsk_…', secure: true, link: 'https://console.groq.com/keys', linkLabel: 'Get key ↗' },
    { key: 'clockify_api_key', label: 'Clockify API Key', placeholder: 'Your Clockify key', secure: true, link: 'https://app.clockify.me/user/settings', linkLabel: 'Get key ↗' },
    { key: 'work_github_token', label: 'GitHub PAT (Work)', placeholder: 'ghp_…', secure: true, link: 'https://github.com/settings/tokens', linkLabel: 'Create token ↗' },
    { key: 'work_github_owner', label: 'GitHub Username (Work)', placeholder: 'your-username', secure: false },
    { key: 'work_github_repo', label: 'GitHub Repo Name (Work)', placeholder: 'my-work-notes', secure: false },
    { key: 'work_hours_goal', label: 'Daily Hours Goal', placeholder: '8', secure: false, keyboardType: 'numeric' },
  ],
  personal: [
    { key: 'personal_github_token', label: 'GitHub PAT (Personal)', placeholder: 'ghp_…', secure: true, link: 'https://github.com/settings/tokens', linkLabel: 'Create token ↗' },
    { key: 'personal_github_owner', label: 'GitHub Username (Personal)', placeholder: 'your-username', secure: false },
    { key: 'personal_github_repo', label: 'GitHub Repo Name (Personal)', placeholder: 'my-personal-notes', secure: false },
  ],
};

const INTEGRATION_TOGGLES = [
  { key: 'integrations_clockify', label: 'Clockify (time tracking)', tab: 'Work only' },
  { key: 'integrations_todos', label: 'Todos (GitHub)', tab: 'Both tabs' },
  { key: 'integrations_notes', label: 'Daily Notes (GitHub)', tab: 'Both tabs' },
];

export default function Settings({ colors, onClose, onThemeChange, currentTheme }) {
  const [values, setValues] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await storage.getAllSettings();
      setValues(all);
    })();
  }, []);

  const set = (key, val) => setValues(v => ({ ...v, [key]: val }));

  const saveAll = async () => {
    setSaving(true);
    for (const [k, v] of Object.entries(values)) {
      if (v !== null && v !== undefined) await storage.set(k, v);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const testGitHub = async (tab) => {
    const key = tab === 'Work' ? 'work' : 'personal';
    const cfg = {
      token: values[`${key}_github_token`]?.trim(),
      owner: values[`${key}_github_owner`]?.trim(),
      repo: values[`${key}_github_repo`]?.trim(),
    };
    if (!cfg.token || !cfg.owner || !cfg.repo) {
      setTestResults(r => ({ ...r, [key]: { ok: false, msg: 'Fill in all three GitHub fields first.' } }));
      return;
    }
    setTesting(t => ({ ...t, [key]: true }));
    try {
      const gh = createGitHubClient(cfg);
      const info = await gh.testConnection();
      setTestResults(r => ({ ...r, [key]: { ok: true, msg: `Connected to ${info.name} (${info.private ? 'private' : 'public'})` } }));
    } catch (e) {
      setTestResults(r => ({ ...r, [key]: { ok: false, msg: e.message } }));
    } finally {
      setTesting(t => ({ ...t, [key]: false }));
    }
  };

  const testClockify = async () => {
    const apiKey = values.clockify_api_key;
    if (!apiKey) { setTestResults(r => ({ ...r, clockify: { ok: false, msg: 'No Clockify key set.' } })); return; }
    setTesting(t => ({ ...t, clockify: true }));
    try {
      const res = await fetch('https://api.clockify.me/api/v1/user', { headers: { 'X-Api-Key': apiKey } });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const u = await res.json();
      setTestResults(r => ({ ...r, clockify: { ok: true, msg: `Connected as ${u.email}` } }));
    } catch (e) {
      setTestResults(r => ({ ...r, clockify: { ok: false, msg: e.message } }));
    } finally {
      setTesting(t => ({ ...t, clockify: false }));
    }
  };

  const openRepo = (tab) => {
    const key = tab === 'Work' ? 'work' : 'personal';
    const owner = values[`${key}_github_owner`];
    const repo = values[`${key}_github_repo`];
    if (owner && repo) Linking.openURL(`https://github.com/${owner}/${repo}`);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onClose}>
          <Text style={[styles.backText, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <TouchableOpacity
          onPress={saveAll}
          style={[styles.saveBtn, { backgroundColor: saving ? colors.textTertiary : colors.accent }]}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* ARIA section */}
        <SectionHeader title="ARIA" colors={colors} />
        {FIELDS.aria.map(f => (
          <FieldRow key={f.key} field={f} value={values[f.key] ?? ''} onChange={v => set(f.key, v)} colors={colors} />
        ))}

        {/* Theme picker */}
        <SectionHeader title="THEME" colors={colors} />
        <View style={styles.themeGrid}>
          {THEME_META.map(t => {
            const isActive = currentTheme === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.themeCard,
                  { backgroundColor: t.preview.bg, borderColor: isActive ? t.preview.accent : colors.border },
                  isActive && { borderWidth: 2 },
                ]}
                onPress={() => onThemeChange(t.key)}
                activeOpacity={0.8}
              >
                <View style={styles.themeSwatches}>
                  <View style={[styles.themeSwatch, { backgroundColor: t.preview.accent }]} />
                  <View style={[styles.themeSwatch, { backgroundColor: t.preview.secondary }]} />
                </View>
                <Text style={[styles.themeName, { color: t.preview.accent }]}>{t.name}</Text>
                <Text style={[styles.themeDesc, { color: t.preview.accent + '99' }]}>{t.desc}</Text>
                {isActive && (
                  <View style={[styles.themeCheck, { backgroundColor: t.preview.accent }]}>
                    <Text style={styles.themeCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* WORK section */}
        <SectionHeader title="WORK" colors={colors} />
        {FIELDS.work.map(f => (
          <FieldRow key={f.key} field={f} value={values[f.key] ?? ''} onChange={v => set(f.key, v)} colors={colors} />
        ))}
        <TestRow label="Test Clockify" onTest={testClockify} loading={testing.clockify} result={testResults.clockify} colors={colors} />
        <TestRow label="Test Work GitHub" onTest={() => testGitHub('Work')} loading={testing.work} result={testResults.work} colors={colors} />
        <TouchableOpacity style={[styles.linkBtn, { borderColor: colors.border }]} onPress={() => openRepo('Work')}>
          <Text style={[styles.linkBtnText, { color: colors.accent }]}>Open Work Repo in GitHub ↗</Text>
        </TouchableOpacity>

        {/* PERSONAL section */}
        <SectionHeader title="PERSONAL" colors={colors} />
        {FIELDS.personal.map(f => (
          <FieldRow key={f.key} field={f} value={values[f.key] ?? ''} onChange={v => set(f.key, v)} colors={colors} />
        ))}
        <TestRow label="Test Personal GitHub" onTest={() => testGitHub('personal')} loading={testing.personal} result={testResults.personal} colors={colors} />
        <TouchableOpacity style={[styles.linkBtn, { borderColor: colors.border }]} onPress={() => openRepo('Personal')}>
          <Text style={[styles.linkBtnText, { color: colors.accent }]}>Open Personal Repo in GitHub ↗</Text>
        </TouchableOpacity>

        {/* INTEGRATIONS section */}
        <SectionHeader title="INTEGRATIONS" colors={colors} />
        {INTEGRATION_TOGGLES.map(t => (
          <View key={t.key} style={[styles.toggleRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>{t.label}</Text>
              <Text style={[styles.fieldSub, { color: colors.textSecondary }]}>{t.tab}</Text>
            </View>
            <Switch
              value={values[t.key] !== false}
              onValueChange={v => set(t.key, v)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        ))}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, colors }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.textSecondary, borderBottomColor: colors.border }]}>
      {title}
    </Text>
  );
}

function FieldRow({ field, value, onChange, colors }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
        {field.link && (
          <TouchableOpacity onPress={() => Linking.openURL(field.link)}>
            <Text style={[styles.fieldLink, { color: colors.accent }]}>{field.linkLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        value={value || ''}
        onChangeText={onChange}
        placeholder={field.placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={field.secure}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={field.multiline}
        numberOfLines={field.multiline ? 3 : 1}
        keyboardType={field.keyboardType || 'default'}
      />
    </View>
  );
}

function TestRow({ label, onTest, loading, result, colors }) {
  return (
    <View style={styles.testRow}>
      <TouchableOpacity
        style={[styles.testBtn, { borderColor: colors.accent }]}
        onPress={onTest}
        disabled={loading}
      >
        {loading ? <ActivityIndicator size="small" color={colors.accent} /> : (
          <Text style={[styles.testBtnText, { color: colors.accent }]}>{label}</Text>
        )}
      </TouchableOpacity>
      {result && (
        <Text style={[styles.testResult, { color: result.ok ? colors.success : colors.danger }]} selectable>
          {result.ok ? '✓ ' : '✗ '}{result.msg}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  backText: { fontSize: fontSize.sm, fontWeight: '600' },
  title: { flex: 1, fontSize: fontSize.lg, fontWeight: '700', textAlign: 'center' },
  saveBtn: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: 6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  scrollContent: { padding: spacing.md },
  sectionHeader: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1.5, marginTop: spacing.lg, marginBottom: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: spacing.xs },
  fieldRow: { marginBottom: spacing.sm },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600' },
  fieldSub: { fontSize: fontSize.xs },
  fieldLink: { fontSize: fontSize.xs, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, fontSize: fontSize.sm },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: spacing.xs, gap: spacing.sm },
  linkBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center', marginVertical: spacing.xs },
  linkBtnText: { fontSize: fontSize.sm, fontWeight: '600' },
  testRow: { marginVertical: spacing.xs },
  testBtn: { borderWidth: 1, borderRadius: radius.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minWidth: 120, justifyContent: 'center' },
  testBtnText: { fontSize: fontSize.sm, fontWeight: '600' },
  testResult: { fontSize: fontSize.xs, marginTop: 4, lineHeight: 18 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  themeCard: {
    width: '47%',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 4,
    position: 'relative',
    minHeight: 80,
  },
  themeSwatches: { flexDirection: 'row', gap: 4, marginBottom: 2 },
  themeSwatch: { width: 14, height: 14, borderRadius: 7 },
  themeName: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1 },
  themeDesc: { fontSize: 10, letterSpacing: 0.2 },
  themeCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCheckText: { color: '#000', fontSize: 10, fontWeight: '800' },
});
