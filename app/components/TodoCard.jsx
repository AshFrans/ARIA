import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, ScrollView, Modal, Pressable, Platform,
} from 'react-native';

let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

function isoFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
import { createGitHubClient } from '../lib/github';
import { parseTodos, serializeTodos, sortTodos } from '../integrations/todos';
import { storage } from '../lib/storage';
import { spacing, fontSize, radius } from '../theme';

const TODOS_PATH = 'todos/todos.md';
const CLOCKIFY_API = 'https://api.clockify.me/api/v1';
const PROJECT_PALETTE = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6','#f97316','#64748b'];

const PRIORITY_COLORS = {
  high: { bg: '#fef2f2', text: '#b91c1c', border: '#fca5a5' },
  medium: { bg: '#fffbeb', text: '#92400e', border: '#fcd34d' },
  low: { bg: '#f0fdf4', text: '#166534', border: '#86efac' },
};

// ─── project helpers ─────────────────────────────────────────────────────────

function projectColor(name, projects) {
  const p = projects.find(x => x.name === name);
  return p?.color || '#64748b';
}

async function loadClockifyProjects(apiKey) {
  if (!apiKey) return [];
  try {
    const userRes = await fetch(`${CLOCKIFY_API}/user`, { headers: { 'X-Api-Key': apiKey } });
    if (!userRes.ok) return [];
    const user = await userRes.json();
    const pRes = await fetch(`${CLOCKIFY_API}/workspaces/${user.defaultWorkspace}/projects?page-size=50`, { headers: { 'X-Api-Key': apiKey } });
    if (!pRes.ok) return [];
    const data = await pRes.json();
    return data.map(p => ({ id: `clockify:${p.id}`, name: p.name, color: p.color || '#6366f1', source: 'clockify' }));
  } catch {
    return [];
  }
}

// ─── component ───────────────────────────────────────────────────────────────

export default function TodoCard({ githubConfig, tab, colors, onTodosLoaded, refreshKey, settings }) {
  const [todos, setTodos] = useState([]);
  const [sha, setSha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  // projects
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  // add modal
  const [addVisible, setAddVisible] = useState(false);
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState(null);
  const [newDueDate, setNewDueDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newProject, setNewProject] = useState(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

  // inline new-project creation inside modal
  const [creatingProject, setCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const hasConfig = githubConfig?.token && githubConfig?.owner && githubConfig?.repo;
  const customProjectsKey = tab === 'Work' ? 'work_custom_projects' : 'personal_custom_projects';

  // ── load projects ──
  const loadProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const custom = ((await storage.get(customProjectsKey)) || []).map(p => ({ ...p, source: 'custom' }));
      const clockify = tab === 'Work' ? await loadClockifyProjects(settings?.clockify_api_key) : [];
      setProjects([...clockify, ...custom]);
    } finally {
      setProjectsLoading(false);
    }
  }, [customProjectsKey, tab, settings?.clockify_api_key]);

  // ── load todos ──
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

  useEffect(() => { load(); loadProjects(); }, [load, loadProjects, refreshKey]);

  // ── save ──
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

  const toggleComplete = (id) => save(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTodo = (id) => save(todos.filter(t => t.id !== id));

  // ── add todo ──
  const openAdd = () => {
    setNewText(''); setNewPriority(null); setNewDueDate(null); setShowDatePicker(false);
    setNewProject(null); setProjectDropdownOpen(false);
    setCreatingProject(false); setNewProjectName('');
    setAddVisible(true);
  };

  const addTodo = async () => {
    if (!newText.trim()) return;
    const updated = [...todos, {
      id: String(Date.now()), text: newText.trim(), completed: false,
      priority: newPriority, due: newDueDate ? isoFromDate(newDueDate) : null, project: newProject || null,
    }];
    await save(updated);
    setAddVisible(false);
  };

  // ── create custom project inline ──
  const confirmNewProject = async () => {
    const name = newProjectName.trim();
    if (!name) return;
    const existing = (await storage.get(customProjectsKey)) || [];
    if (existing.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      // Already exists — just select it
      setNewProject(name);
      setCreatingProject(false); setNewProjectName('');
      return;
    }
    const color = PROJECT_PALETTE[existing.length % PROJECT_PALETTE.length];
    const proj = { id: `custom:${Date.now()}`, name, color };
    await storage.set(customProjectsKey, [...existing, proj]);
    const updated = [...projects, { ...proj, source: 'custom' }];
    setProjects(updated);
    setNewProject(name);
    setCreatingProject(false); setNewProjectName('');
  };

  // ── rendering ──
  const visible = showCompleted ? todos : todos.filter(t => !t.completed);
  const sorted = sortTodos(visible);

  const githubUrl = hasConfig
    ? `https://github.com/${githubConfig.owner}/${githubConfig.repo}/blob/HEAD/${TODOS_PATH}`
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
        <ScrollView
          style={styles.listScroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {sorted.map(todo => (
            <TodoRow
              key={todo.id}
              todo={todo}
              colors={colors}
              projectColor={projectColor(todo.project, projects)}
              onToggle={() => toggleComplete(todo.id)}
              onDelete={() => deleteTodo(todo.id)}
            />
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={[styles.addBtn, { borderColor: colors.border }]} onPress={openAdd}>
        <Text style={[styles.addBtnText, { color: colors.accent }]}>+ Add Todo</Text>
      </TouchableOpacity>

      {/* ── Add modal ── */}
      <Modal visible={addVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setAddVisible(false)}>
          <Pressable style={[styles.modal, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Todo</Text>

            {/* Task text */}
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
              placeholder="What needs to be done?"
              placeholderTextColor={colors.textTertiary}
              value={newText}
              onChangeText={setNewText}
              autoFocus
            />

            {/* Project picker — dropdown */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Project</Text>
            {projectsLoading ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.dropdownTrigger, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                  onPress={() => { setProjectDropdownOpen(v => !v); setCreatingProject(false); }}
                >
                  {newProject ? (
                    <View style={styles.dropdownTriggerInner}>
                      <View style={[styles.projectDot, { backgroundColor: projects.find(p => p.name === newProject)?.color || '#64748b' }]} />
                      <Text style={[styles.dropdownTriggerText, { color: colors.text }]}>{newProject}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.dropdownTriggerText, { color: colors.textTertiary }]}>Select project…</Text>
                  )}
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{projectDropdownOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {projectDropdownOpen && (
                  <ScrollView
                    style={[styles.dropdownList, { borderColor: colors.border, backgroundColor: colors.surface }]}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {/* None option */}
                    <TouchableOpacity
                      style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                      onPress={() => { setNewProject(null); setProjectDropdownOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.textTertiary }]}>None</Text>
                    </TouchableOpacity>

                    {projects.map(p => (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.dropdownItem, { borderBottomColor: colors.border, backgroundColor: newProject === p.name ? p.color + '18' : 'transparent' }]}
                        onPress={() => { setNewProject(p.name); setProjectDropdownOpen(false); }}
                      >
                        <View style={[styles.projectDot, { backgroundColor: p.color }]} />
                        <Text style={[styles.dropdownItemText, { color: colors.text, fontWeight: newProject === p.name ? '700' : '400' }]}>{p.name}</Text>
                        {newProject === p.name && <Text style={{ color: colors.accent, fontSize: 12, marginLeft: 'auto' }}>✓</Text>}
                      </TouchableOpacity>
                    ))}

                    {/* New project row */}
                    {creatingProject ? (
                      <View style={[styles.dropdownItem, { gap: spacing.xs }]}>
                        <TextInput
                          style={[styles.newProjectText, { color: colors.text, flex: 1 }]}
                          value={newProjectName}
                          onChangeText={setNewProjectName}
                          placeholder="Project name"
                          placeholderTextColor={colors.textTertiary}
                          autoFocus
                          onSubmitEditing={confirmNewProject}
                          returnKeyType="done"
                        />
                        <TouchableOpacity onPress={confirmNewProject}>
                          <Text style={{ color: colors.accent, fontWeight: '700', fontSize: fontSize.sm }}>✓</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { setCreatingProject(false); setNewProjectName(''); }}>
                          <Text style={{ color: colors.textTertiary, fontSize: fontSize.sm }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
                        onPress={() => setCreatingProject(true)}
                      >
                        <Text style={[styles.dropdownItemText, { color: colors.accent }]}>+ New project</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}
              </>
            )}

            {/* Priority */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Priority</Text>
            <View style={styles.chipRow}>
              {['high', 'medium', 'low'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityChip, { backgroundColor: newPriority === p ? colors.accent : colors.surfaceAlt }]}
                  onPress={() => setNewPriority(newPriority === p ? null : p)}
                >
                  <Text style={{ color: newPriority === p ? '#fff' : colors.textSecondary, fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Due date */}
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Due Date</Text>
            {Platform.OS === 'web' ? (
              <View style={[styles.dateRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
                <input
                  type="date"
                  value={newDueDate ? isoFromDate(newDueDate) : ''}
                  onChange={e => {
                    if (!e.target.value) { setNewDueDate(null); return; }
                    const d = new Date(e.target.value + 'T00:00:00');
                    if (!isNaN(d)) setNewDueDate(d);
                  }}
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    backgroundColor: 'transparent', color: colors.text,
                    fontSize: fontSize.sm, padding: 0,
                  }}
                />
                {newDueDate && (
                  <TouchableOpacity onPress={() => setNewDueDate(null)}>
                    <Text style={{ color: colors.textTertiary, fontSize: 14 }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.dateRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}
                  onPress={() => setShowDatePicker(v => !v)}
                >
                  <Text style={[styles.dateRowText, { color: newDueDate ? colors.text : colors.textTertiary }]}>
                    {newDueDate ? isoFromDate(newDueDate) : 'No due date (optional)'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'center' }}>
                    {newDueDate && (
                      <TouchableOpacity onPress={e => { e.stopPropagation?.(); setNewDueDate(null); setShowDatePicker(false); }}>
                        <Text style={{ color: colors.textTertiary, fontSize: 14 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={{ color: colors.accent, fontSize: 14 }}>📅</Text>
                  </View>
                </TouchableOpacity>
                {showDatePicker && DateTimePicker && (
                  <DateTimePicker
                    value={newDueDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') setShowDatePicker(false);
                      if (event.type === 'dismissed') return;
                      if (selectedDate) setNewDueDate(selectedDate);
                    }}
                    themeVariant={colors.isDark ? 'dark' : 'light'}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: saving || !newText.trim() ? colors.textTertiary : colors.accent }]}
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

// ─── TodoRow ─────────────────────────────────────────────────────────────────

function TodoRow({ todo, colors, projectColor: pColor, onToggle, onDelete }) {
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
          {/* Project badge — shown first and most prominently */}
          {todo.project && (
            <View style={[styles.tag, { backgroundColor: pColor + '22', borderColor: pColor + '66' }]}>
              <View style={[styles.projectDotSmall, { backgroundColor: pColor }]} />
              <Text style={[styles.tagText, { color: pColor }]}>{todo.project}</Text>
            </View>
          )}
          {!todo.project && (
            <View style={[styles.tag, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textTertiary }]}>Unassigned</Text>
            </View>
          )}
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

// ─── styles ──────────────────────────────────────────────────────────────────

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
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 3, gap: spacing.xs },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  tagText: { fontSize: 10, fontWeight: '700' },
  projectDotSmall: { width: 5, height: 5, borderRadius: 99 },
  dueText: { fontSize: 10 },
  empty: { fontSize: fontSize.sm, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.md },
  error: { fontSize: fontSize.sm, marginVertical: spacing.sm },
  listScroll: { maxHeight: 340 },
  addBtn: { marginTop: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderStyle: 'dashed', paddingVertical: spacing.sm, alignItems: 'center' },
  addBtnText: { fontSize: fontSize.sm, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.lg },
  modal: { borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', marginBottom: spacing.xs },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.5, marginTop: spacing.xs },
  input: { borderWidth: 1, borderRadius: radius.sm, padding: spacing.sm, fontSize: fontSize.sm },
  chipRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  projectDot: { width: 7, height: 7, borderRadius: 99 },
  newProjectText: { fontSize: fontSize.xs, minWidth: 80 },
  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  dropdownTriggerInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dropdownTriggerText: { fontSize: fontSize.sm },
  dropdownList: { borderWidth: 1, borderRadius: radius.sm, maxHeight: 180, marginTop: 2 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.sm, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  dropdownItemText: { fontSize: fontSize.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
  dateRowText: { fontSize: fontSize.sm },
  priorityChip: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  saveBtn: { borderRadius: radius.sm, paddingVertical: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
});
