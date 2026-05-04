import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, useWindowDimensions,
  SafeAreaView, StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import { storage } from './lib/storage';
import TabBar from './components/TabBar';
import ChatPanel from './components/ChatPanel';
import WorkDashboard from './screens/WorkDashboard';
import PersonalDashboard from './screens/PersonalDashboard';
import NoteEditor from './screens/NoteEditor';
import Settings from './screens/Settings';
import { light, dark, spacing, fontSize, radius } from './theme';

const BREAKPOINT = 768;

// Splash / loading screen
function SplashScreen({ ariaName }) {
  return (
    <View style={styles.splash}>
      <View style={styles.splashInner}>
        <Text style={styles.splashLogo}>{ariaName || 'Aria'}</Text>
        <Text style={styles.splashTagline}>Your brilliant personal assistant</Text>
        <ActivityIndicator color="#818cf8" style={{ marginTop: 32 }} size="large" />
      </View>
    </View>
  );
}

export default function App() {
  const { width } = useWindowDimensions();
  const isWide = width >= BREAKPOINT;

  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('Work');
  const [showSettings, setShowSettings] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showChat, setShowChat] = useState(false); // mobile-only FAB toggle
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Context passed to ChatPanel so Aria can reference live data
  const [workContext, setWorkContext] = useState({ todos: [], noteSnippet: null, todayHours: 0, currentEntry: null });
  const [personalContext, setPersonalContext] = useState({ todos: [], noteSnippet: null });

  const colors = isDark ? dark : light;

  // Load persisted settings and tab on mount
  useEffect(() => {
    (async () => {
      const all = await storage.getAllSettings();
      setSettings(all);
      setIsDark(all.aria_theme === 'dark');
      const tab = all.active_tab || 'Work';
      setActiveTab(tab);

      setReady(true);
    })();
  }, []);

  const handleTabChange = useCallback(async (tab) => {
    setActiveTab(tab);
    await storage.set('active_tab', tab);
  }, []);

  const handleThemeToggle = useCallback(async (val) => {
    setIsDark(val);
    await storage.set('aria_theme', val ? 'dark' : 'light');
  }, []);

  const reloadSettings = useCallback(async () => {
    const all = await storage.getAllSettings();
    setSettings(all);
    setIsDark(all.aria_theme === 'dark');
  }, []);

  const handleSettingsClose = useCallback(() => {
    setShowSettings(false);
    reloadSettings();
  }, [reloadSettings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshKey(k => k + 1);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const handleToolExecuted = useCallback(() => setRefreshKey(k => k + 1), []);

  // GitHub config helpers
  const workGitHub = settings.work_github_token
    ? { token: settings.work_github_token, owner: settings.work_github_owner, repo: settings.work_github_repo }
    : null;
  const personalGitHub = settings.personal_github_token
    ? { token: settings.personal_github_token, owner: settings.personal_github_owner, repo: settings.personal_github_repo }
    : null;
  const activeGitHub = activeTab === 'Work' ? workGitHub : personalGitHub;

  // Note editor
  const handleOpenNote = useCallback(() => setShowNoteEditor(true), []);
  const handleCloseNote = useCallback(() => setShowNoteEditor(false), []);

  // Context callbacks for cards
  const onWorkTodos = useCallback((todos) => setWorkContext(c => ({ ...c, todos })), []);
  const onWorkNote = useCallback((note) => setWorkContext(c => ({ ...c, noteSnippet: note ? note.slice(0, 500) : null })), []);
  const onPersonalTodos = useCallback((todos) => setPersonalContext(c => ({ ...c, todos })), []);
  const onPersonalNote = useCallback((note) => setPersonalContext(c => ({ ...c, noteSnippet: note ? note.slice(0, 500) : null })), []);

  const ariaName = settings.aria_name || 'Aria';
  const activeContext = activeTab === 'Work' ? workContext : personalContext;

  const serviceStatuses = activeTab === 'Work'
    ? [
        { label: 'Groq', connected: !!settings.groq_api_key },
        { label: 'Clockify', connected: !!settings.clockify_api_key },
        { label: 'GitHub', connected: !!settings.work_github_token },
      ]
    : [
        { label: 'Groq', connected: !!settings.groq_api_key },
        { label: 'GitHub', connected: !!settings.personal_github_token },
      ];

  if (!ready) return <SplashScreen ariaName={ariaName} />;

  // Full-screen overlays
  if (showSettings) {
    return (
      <Settings
        colors={colors}
        onClose={handleSettingsClose}
        onThemeToggle={handleThemeToggle}
        isDark={isDark}
      />
    );
  }

  if (showNoteEditor) {
    return (
      <NoteEditor
        githubConfig={activeGitHub}
        tab={activeTab}
        colors={colors}
        onClose={handleCloseNote}
      />
    );
  }

  const dashboardProps = {
    settings,
    colors,
    onOpenNote: handleOpenNote,
    refreshing,
    onRefresh: handleRefresh,
    refreshKey,
  };

  const chatPanel = (
    <ChatPanel
      settings={settings}
      activeTab={activeTab}
      context={activeContext}
      colors={colors}
      style={isWide ? styles.chatPanelWide : styles.chatPanelMobile}
      onToolExecuted={handleToolExecuted}
    />
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.headerBg}
      />

      {/* App Header */}
      <View style={[styles.appHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.ariaName, { color: colors.accent }]}>{ariaName}</Text>
          <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={styles.headerServices}>
          {serviceStatuses.map(({ label, connected }) => (
            <View key={label} style={styles.serviceItem}>
              <View style={[styles.serviceDot, { backgroundColor: connected ? colors.success : colors.textTertiary }]} />
              <Text style={[styles.serviceLabel, { color: connected ? colors.textSecondary : colors.textTertiary }]}>{label}</Text>
            </View>
          ))}
        </View>
        <View style={styles.headerRight}>
          <Text style={[styles.tabIndicator, { color: colors.textSecondary }]}>
            {activeTab}
          </Text>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.gearBtn} accessibilityLabel="Settings">
            <Text style={{ fontSize: 22 }}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab bar */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} colors={colors} />

      {/* Main layout */}
      {isWide ? (
        // Two-column desktop layout
        <View style={styles.wideLayout}>
          <View style={[styles.leftColumn, { borderRightColor: colors.border }]}>
            {chatPanel}
          </View>
          <View style={styles.rightColumn}>
            {activeTab === 'Work' ? (
              <WorkDashboard
                {...dashboardProps}
                onTodosLoaded={onWorkTodos}
                onNoteLoaded={onWorkNote}
              />
            ) : (
              <PersonalDashboard
                {...dashboardProps}
                onTodosLoaded={onPersonalTodos}
                onNoteLoaded={onPersonalNote}
              />
            )}
          </View>
        </View>
      ) : (
        // Mobile: stacked cards, FAB opens chat
        <View style={{ flex: 1 }}>
          {showChat ? (
            <View style={{ flex: 1 }}>
              {chatPanel}
              <TouchableOpacity
                style={[styles.fab, styles.fabBack, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setShowChat(false)}
              >
                <Text style={[styles.fabBackText, { color: colors.text }]}>← Dashboard</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {activeTab === 'Work' ? (
                <WorkDashboard
                  {...dashboardProps}
                  onTodosLoaded={onWorkTodos}
                  onNoteLoaded={onWorkNote}
                />
              ) : (
                <PersonalDashboard
                  {...dashboardProps}
                  onTodosLoaded={onPersonalTodos}
                  onNoteLoaded={onPersonalNote}
                />
              )}
              {/* FAB */}
              <TouchableOpacity
                style={[styles.fab, { backgroundColor: colors.accent }]}
                onPress={() => setShowChat(true)}
                accessibilityLabel={`Chat with ${ariaName}`}
              >
                <Text style={styles.fabIcon}>💬</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashInner: { alignItems: 'center' },
  splashLogo: {
    fontSize: 56,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: -1,
  },
  splashTagline: {
    fontSize: fontSize.md,
    color: '#94a3b8',
    marginTop: spacing.sm,
    letterSpacing: 0.5,
  },
  safeArea: { flex: 1 },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  ariaName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    marginLeft: 2,
  },
  headerServices: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  headerRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  serviceItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  serviceDot: { width: 6, height: 6, borderRadius: 3 },
  serviceLabel: { fontSize: fontSize.xs },
  tabIndicator: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  gearBtn: { padding: spacing.xs, marginLeft: spacing.sm },
  wideLayout: { flex: 1, flexDirection: 'row' },
  leftColumn: {
    width: 380,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  rightColumn: { flex: 1 },
  chatPanelWide: { flex: 1 },
  chatPanelMobile: { flex: 1 },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 16px rgba(0,0,0,0.25)' },
    }),
  },
  fabIcon: { fontSize: 24 },
  fabBack: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    width: 'auto',
    height: 'auto',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  fabBackText: { fontSize: fontSize.sm, fontWeight: '600' },
});
