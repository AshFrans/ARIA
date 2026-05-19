import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import HoursCard from '../components/HoursCard';
import TodoCard from '../components/TodoCard';
import NoteSnippetCard from '../components/NoteSnippetCard';
import { spacing } from '../theme';

export default function WorkDashboard({ settings, colors, onOpenNote, onTodosLoaded, onNoteLoaded, refreshing, onRefresh, refreshKey }) {
  const githubConfig = useMemo(() => settings?.work_github_token
    ? {
        token: settings.work_github_token,
        owner: settings.work_github_owner,
        repo: settings.work_github_repo,
      }
    : null,
  [settings?.work_github_token, settings?.work_github_owner, settings?.work_github_repo]);

  const dailyGoal = Number(settings?.work_hours_goal) || 8;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <HoursCard
        clockifyKey={settings?.clockify_api_key}
        dailyGoal={dailyGoal}
        colors={colors}
        refreshKey={refreshKey}
      />
      <TodoCard
        githubConfig={githubConfig}
        tab="Work"
        colors={colors}
        onTodosLoaded={onTodosLoaded}
        refreshKey={refreshKey}
        settings={settings}
      />
      <NoteSnippetCard
        githubConfig={githubConfig}
        tab="Work"
        colors={colors}
        onExpand={onOpenNote}
        onNoteLoaded={onNoteLoaded}
        refreshKey={refreshKey}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
});
