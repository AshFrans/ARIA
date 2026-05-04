import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { createGitHubClient } from '../lib/github';
import { todayPath, formatNoteDate, getMarkdownStyles } from '../lib/markdown';
import { spacing, fontSize, radius } from '../theme';

const NOTE_PATH = () => `notes/${todayPath()}.md`;

export default function NoteSnippetCard({ githubConfig, tab, colors, onExpand, onNoteLoaded, refreshKey }) {
  const mdStyles = getMarkdownStyles(colors);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const everLoadedRef = useRef(false);

  const hasConfig = githubConfig?.token && githubConfig?.owner && githubConfig?.repo;

  const load = useCallback(async () => {
    if (!hasConfig) {
      setError('GitHub not configured. Add credentials in Settings.');
      setLoading(false);
      return;
    }
    try {
      const gh = createGitHubClient(githubConfig);
      const file = await gh.getFile(NOTE_PATH());
      if (file) {
        setContent(file.content);
        onNoteLoaded?.(file.content);
        everLoadedRef.current = true;
      } else {
        setContent(null);
        onNoteLoaded?.(null);
      }
      setError(null);
    } catch (e) {
      if (!everLoadedRef.current) setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [githubConfig, hasConfig]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const githubUrl = hasConfig
    ? `https://github.com/${githubConfig.owner}/${githubConfig.repo}/blob/main/${NOTE_PATH()}`
    : null;

  // Snippet: first 3 meaningful lines after the heading
  const snippet = content
    ? content
        .split('\n')
        .filter(l => l.trim() && !l.startsWith('# Notes'))
        .slice(0, 4)
        .join('\n')
    : null;

  return (
    <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{tab.toUpperCase()} NOTES</Text>
          <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>{formatNoteDate()}</Text>
        </View>
        <View style={styles.headerActions}>
          {githubUrl && (
            <TouchableOpacity onPress={() => { const { Linking } = require('react-native'); Linking.openURL(githubUrl); }}>
              <Text style={[styles.actionLink, { color: colors.textSecondary }]}>GitHub ↗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : snippet ? (
        <>
          <View style={styles.snippetContainer} pointerEvents="none">
            <Markdown style={mdStyles}>{snippet}</Markdown>
          </View>
          <TouchableOpacity onPress={onExpand} style={styles.expandBtn}>
            <Text style={[styles.expandText, { color: colors.accent }]}>Open editor →</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity onPress={onExpand} style={[styles.emptyBtn, { borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No note yet today. Tap to start writing.</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1 },
  dateLabel: { fontSize: fontSize.xs, marginTop: 2 },
  actionLink: { fontSize: fontSize.xs, fontWeight: '600' },
  snippetContainer: { maxHeight: 110, overflow: 'hidden' },
  expandBtn: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  expandText: { fontSize: fontSize.sm, fontWeight: '600' },
  emptyBtn: { borderWidth: 1, borderStyle: 'dashed', borderRadius: radius.sm, padding: spacing.md, alignItems: 'center' },
  emptyText: { fontSize: fontSize.sm, fontStyle: 'italic', textAlign: 'center' },
  error: { fontSize: fontSize.sm, marginVertical: spacing.sm },
});
