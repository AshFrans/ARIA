import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, ScrollView, Modal, Pressable,
} from 'react-native';
import { createGitHubClient } from '../lib/github';
import { parseTodos, serializeTodos } from '../integrations/todos';
import { spacing, fontSize, radius } from '../theme';

const TODOS_PATH = 'todos/todos.md';

const PRIORITY_COLORS = {
  high: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  medium: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  low: { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

export default function TodoCard({ githubConfig, tab, colors, onTodosLoaded, refreshKey }) {
  const [todos, setTodos] = useState([]);
  const [sha, setSha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState(null);
  const [newDue, setNewDue] = useState('');
  const [saving, setSaving] = useState(false);

  const hasConfig = githubConfig?.token && githubConfig?.owner && githubConfig?.repo;

  const load = useCallback(async () => {
    if (!hasConfig) {
      setError('GitHub not configured. Add your token, owner, and repo in Settings.');
      setLoading(false);
      return;
    }
    try {
      const gh = createGitHubClient(githubConfig);
      const file = await gh.getFile(TODOS_PATH);
      if (file) {
        const parsed = parseTodos(file.content);
        setTodos(parsed);
        setSha(file.sha);
        onTodosLoaded?.(parsed);
      } else {
        setTodos([]);
      }
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [githubConfig, hasConfig]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const save = async (updated) => {
    setSaving(true);
    try {
      const gh = createGitHubClient(githubConfig);
      const content = serializeTodos(updated);
      const result = await gh.putFile(TODOS_PATH, content, sha, 'Update todos via Aria');
      setSha(result.content.sha);
      setTodos(updated);
      onTodosLoaded?.(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleComplete = (id) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    save(updated);
  };

  const deleteTodo = (id) => {
    const updated = todos.filter(t => t.id !== id);
    save(updated);
  };

  const addTodo = async () => {
    if (!newText.trim()) return;
    const updated = [...todos, { id: String(Date.now()), text: newText.trim(), completed: false, priority: newPriority, due: newDue || null }];
    await save(updated);
    setNewText('');
    setNewPriority(null);
    setNewDue('');
    setAddVisible(false);
  };

  const visible = showCompleted ? todos : todos.filter(t => !t.completed);
  const sorted = [
    ...visible.filter(t => !t.completed),
    ...visible.filter(t => t.completed),
  ];

  const githubUrl = hasConfig
    ? `https://github.com/${githubConfig.owner}/${githubConfig.repo}/blob/main/${TODOS_PATH}`
    : null;

  return (
    <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{tab.toUpperCase()} TODOS</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setShowCompleted(v => !v)}>
            <Text style={[styles.toggleLabel, { color: colors.accent }]}>
              {showCompleted ? 'Hide done' : 'Show done'}
            </Text>
          </TouchableOpacity>
          {githubUrl && (
            <TouchableOpacity onPress={() => { const { Linking } = require('react-native'); Linking.openURL(githubUrl); }}>
              <Text style={[styles.toggleLabel, { color: colors.textSecondary }]}>GitHub ↗</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : sorted.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textTertiary }]}>
          {todos.length === 0 ? 'No todos yet. Add one below!' : 'All done! 🎉'}
        </Text>
      ) : (
        sorted.map(todo => (
          <TodoRow
            key={todo.id}
            todo={todo}
            colors={colors}
            onToggle={() => toggleComplete(todo.id)}
            onDelete={() => deleteTodo(todo.id)}
          />
        ))
      )}

      {/* Add button */}
      <TouchableOpacity
        style={[styles.addBtn, { borderColor: colors.border }]}
        onPress={() => setAddVisible(true)}
      >
        <Text style={[styles.addBtnText, { color: colors.accent }]}>+ Add Todo</Text>
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={addVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setAddVisible(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Todo</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textTertiary}
              value={newText}
              onChangeText={setNewText}
              autoFocus
            />
            <View style={styles.priorityRow}>
              {['high', 'medium', 'low'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityChip, {
                    backgroundColor: newPriority === p ? colors.accent : colors.surfaceAlt,
                  }]}
                  onPress={() => setNewPriority(newPriority === p ? null : p)}
                >
                  <Text style={{ color: newPriority === p ? '#fff' : colors.textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              placeholder="Due date: YYYY-MM-DD (optional)"
              placeholderTextColor={colors.textTertiary}
              value={newDue}
              onChangeText={setNewDue}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving ? colors.textTertiary : colors.accent }]}
              onPress={addTodo}
              disabled={saving || !newText.trim()}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Add'}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TodoRow({ todo, colors, onToggle, onDelete }) {
  const pc = PRIORITY_COLORS[todo.priority];
  return (
    <View style={[styles.row, todo.completed && styles.rowCompleted]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkbox}>
        <View style={[styles.checkboxBox, { borderColor: todo.completed ? colors.success : colors.border, backgroundColor: todo.completed ? colors.success : 'transparent' }]}>
          {todo.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={[styles.todoText, { color: colors.text }, todo.completed && styles.strikethrough]}>
          {todo.text}
        </Text>
        <View style={styles.tags}>
          {todo.priority && pc && (
            <View style={[styles.tag, { backgroundColor: pc.bg, borderColor: pc.border }]}>
              <Text style={[styles.tagText, { color: pc.text }]}>#{todo.priority}</Text>
            </View>
          )}
          {todo.due && (
            <Text style={[styles.dueText, { color: colors.textTertiary }]}>due {todo.due}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={{ color: colors.textTertiary, fontSize: 16 }}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  headerActions: { flexDirection: 'row', gap: spacing.md },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1 },
  toggleLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.06)', gap: spacing.sm },
  rowCompleted: { opacity: 0.55 },
  checkbox: { paddingTop: 2 },
  checkboxBox: { width: 18, height: 18, borderWidth: 2, borderRadius: radius.sm - 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 11, fontWeight: '700' },
  todoText: { fontSize: fontSize.sm, lineHeight: 20 },
  strikethrough: { textDecorationLine: 'line-through' },
  tags: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: spacing.xs },
  tag: { borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '700' },
  dueText: { fontSize: 10 },
  empty: { fontSize: fontSize.sm, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.md },
  error: { fontSize: fontSize.sm, marginVertical: spacing.sm },
  addBtn: { marginTop: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', paddingVertical: spacing.sm, alignItems: 'center' },
  addBtnText: { fontSize: fontSize.sm, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modal: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, fontSize: fontSize.sm },
  priorityRow: { flexDirection: 'row', gap: spacing.sm },
  priorityChip: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  saveBtn: { borderRadius: radius.sm, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
});
