import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, RefreshControl } from 'react-native';
import TodoCard from '../components/TodoCard';
import NoteSnippetCard from '../components/NoteSnippetCard';
import CalendarCard from '../components/CalendarCard';
import { spacing } from '../theme';

export default function PersonalDashboard({ settings, colors, onOpenNote, onTodosLoaded, onNoteLoaded, refreshing, onRefresh, refreshKey }) {
  const [todos, setTodos] = useState([]);

  const githubConfig = useMemo(() => settings?.personal_github_token
    ? {
        token: settings.personal_github_token,
        owner: settings.personal_github_owner,
        repo: settings.personal_github_repo,
      }
    : null,
  [settings?.personal_github_token, settings?.personal_github_owner, settings?.personal_github_repo]);

  const handleTodosLoaded = useCallback((t) => {
    setTodos(t);
    onTodosLoaded?.(t);
  }, [onTodosLoaded]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <CalendarCard
        todos={todos}
        colors={colors}
        refreshKey={refreshKey}
      />
      <TodoCard
        githubConfig={githubConfig}
        tab="Personal"
        colors={colors}
        onTodosLoaded={handleTodosLoaded}
        refreshKey={refreshKey}
        settings={settings}
      />
      <NoteSnippetCard
        githubConfig={githubConfig}
        tab="Personal"
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
