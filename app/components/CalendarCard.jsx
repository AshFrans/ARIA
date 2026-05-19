import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { fetchMonthData } from '../integrations/clockify';
import { spacing, fontSize, radius } from '../theme';

const DAY_LABELS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTH_NAMES_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const PRIORITY_COLORS = {
  high:   { bg: '#2A0A0A', text: '#E06060', border: '#5A1A1A' },
  medium: { bg: '#1E1608', text: '#C8892A', border: '#4A3210' },
  low:    { bg: '#0A180A', text: '#3CCA78', border: '#1A4A1A' },
};

function toIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function CalendarCard({ clockifyKey, todos = [], colors, refreshKey }) {
  const today = new Date();
  const todayStr = toIso(today);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [monthHours, setMonthHours] = useState({});
  const [selectedDay, setSelectedDay] = useState(todayStr);
  const [loading, setLoading] = useState(false);

  const loadMonth = useCallback(async () => {
    if (!clockifyKey) return;
    setLoading(true);
    try {
      const data = await fetchMonthData(clockifyKey, viewYear, viewMonth);
      setMonthHours(data);
    } finally {
      setLoading(false);
    }
  }, [clockifyKey, viewYear, viewMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth, refreshKey]);

  const prevMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const todosByDate = {};
  for (const t of todos) {
    if (!t.completed && t.due) {
      (todosByDate[t.due] = todosByDate[t.due] || []).push(t);
    }
  }

  // Build grid: leading empty cells + day cells
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, ds });
  }
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const selDate = selectedDay ? new Date(selectedDay + 'T12:00:00') : null;
  const selTodos = selectedDay ? (todosByDate[selectedDay] || []) : [];
  const selHours = selectedDay ? (monthHours[selectedDay] || 0) : 0;

  return (
    <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.surface }]}>

      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.titleBar, { backgroundColor: colors.accent }]} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CALENDAR</Text>
        </View>
        <View style={styles.navGroup}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
          </TouchableOpacity>
        </View>
        {loading
          ? <ActivityIndicator size="small" color={colors.accent} style={{ width: 20 }} />
          : <View style={{ width: 20 }} />
        }
      </View>

      {/* ── Grid ── */}
      <View style={[styles.grid, { borderColor: colors.border }]}>
        {/* Day-of-week header row */}
        {DAY_LABELS.map(l => (
          <View key={l} style={[styles.headerCell, { borderColor: colors.border, backgroundColor: colors.accentLight }]}>
            <Text style={[styles.dayLabel, { color: colors.accent }]}>{l}</Text>
          </View>
        ))}

        {/* Day cells */}
        {cells.map((cell, idx) => {
          if (!cell) {
            return (
              <View
                key={`e${idx}`}
                style={[styles.dayCell, { borderColor: colors.border, backgroundColor: colors.background }]}
              />
            );
          }

          const isToday = cell.ds === todayStr;
          const isSel = cell.ds === selectedDay;
          const hasHours = !!monthHours[cell.ds];
          const hasTodo = !!todosByDate[cell.ds];
          const isPast = cell.ds < todayStr && !isToday;
          const isOverdue = isPast && hasTodo;

          const todayGlow = Platform.OS === 'web' && isToday
            ? { boxShadow: `inset 0 0 0 2px ${colors.accent}` }
            : {};

          return (
            <TouchableOpacity
              key={cell.ds}
              style={[
                styles.dayCell,
                { borderColor: colors.border },
                isSel && { backgroundColor: colors.accentLight, borderColor: colors.accent },
                isToday && { borderColor: colors.accent, ...todayGlow },
              ]}
              onPress={() => setSelectedDay(isSel ? null : cell.ds)}
              activeOpacity={0.7}
            >
              {/* Day number */}
              <View style={[
                styles.dayNumWrap,
                isToday && { backgroundColor: colors.accent },
              ]}>
                <Text style={[
                  styles.dayNum,
                  { color: isToday ? colors.surface : isSel ? colors.accentText : isPast ? colors.textTertiary : colors.text },
                  isToday && { fontWeight: '800' },
                ]}>
                  {cell.day}
                </Text>
              </View>

              {/* Indicators — each one clearly inside its cell */}
              <View style={styles.dotRow}>
                {hasHours && (
                  <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                )}
                {hasTodo && (
                  <View style={[styles.dot, { backgroundColor: isOverdue ? colors.danger : colors.warning }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Legend ── */}
      <View style={[styles.legend, { borderTopColor: colors.border }]}>
        {clockifyKey && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>Logged</Text>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Due</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Overdue</Text>
        </View>
      </View>

      {/* ── Selected day detail ── */}
      {selectedDay && (
        <View style={[styles.detail, { backgroundColor: colors.accentLight, borderColor: colors.border }]}>
          <View style={styles.detailHeader}>
            <Text style={[styles.detailPrompt, { color: colors.accent }]}>▸</Text>
            <Text style={[styles.detailDate, { color: colors.text }]}>
              {selDate
                ? selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()
                : selectedDay}
            </Text>
            {selectedDay === todayStr && (
              <View style={[styles.todayBadge, { backgroundColor: colors.accent + '22', borderColor: colors.accent + '55' }]}>
                <Text style={[styles.todayBadgeText, { color: colors.accent }]}>TODAY</Text>
              </View>
            )}
          </View>

          {clockifyKey && (
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textTertiary }]}>TIME</Text>
              {selHours > 0 ? (
                <View style={styles.detailHoursGroup}>
                  <Text style={[styles.detailValue, { color: colors.accentText }]}>{selHours.toFixed(1)}h</Text>
                  <View style={[styles.microBar, { backgroundColor: colors.border }]}>
                    <View style={[styles.microBarFill, {
                      width: `${Math.min((selHours / 8) * 100, 100)}%`,
                      backgroundColor: colors.accent,
                    }]} />
                  </View>
                </View>
              ) : (
                <Text style={[styles.detailValue, { color: colors.textTertiary }]}>—</Text>
              )}
            </View>
          )}

          {selTodos.length > 0 ? (
            <View style={styles.detailTodos}>
              {selTodos.map(t => {
                const pc = PRIORITY_COLORS[t.priority];
                return (
                  <View key={t.id} style={styles.detailTodoRow}>
                    <Text style={[styles.detailBullet, { color: colors.accent }]}>·</Text>
                    <Text style={[styles.detailTodoText, { color: colors.text }]} numberOfLines={1}>{t.text}</Text>
                    {t.priority && pc && (
                      <View style={[styles.priorityTag, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                        <Text style={[styles.priorityTagText, { color: pc.text }]}>{t.priority.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.detailRow}>
              <Text style={[styles.detailKey, { color: colors.textTertiary }]}>TODOS</Text>
              <Text style={[styles.detailValue, { color: colors.textTertiary }]}>none due</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  titleGroup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleBar: { width: 3, height: 13, borderRadius: 2 },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1.5 },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navArrow: { fontSize: 22, fontWeight: '300', lineHeight: 24 },
  monthLabel: { fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1, minWidth: 88, textAlign: 'center' },

  // Grid: outer border, cells share borders
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  headerCell: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  dayLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  dayCell: {
    width: '14.2857%',
    minHeight: 48,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    paddingHorizontal: 2,
  },
  dayNumWrap: {
    width: 26,
    height: 26,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 12, fontWeight: '600' },
  dotRow: {
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
    minHeight: 6,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 5, height: 5, borderRadius: 3 },
  legendText: { fontSize: 10, letterSpacing: 0.3 },

  // Detail panel
  detail: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  detailPrompt: { fontSize: fontSize.sm, fontWeight: '700' },
  detailDate: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.5, flex: 1 },
  todayBadge: { borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  todayBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailKey: { fontSize: 10, fontWeight: '700', letterSpacing: 1, width: 40 },
  detailValue: { fontSize: fontSize.xs, fontWeight: '600' },
  detailHoursGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  microBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  microBarFill: { height: '100%', borderRadius: 2 },
  detailTodos: { gap: 4, marginTop: 2 },
  detailTodoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailBullet: { fontSize: fontSize.lg, lineHeight: 16 },
  detailTodoText: { fontSize: fontSize.xs, flex: 1, lineHeight: 16 },
  priorityTag: { borderWidth: 1, borderRadius: radius.sm - 2, paddingHorizontal: 4, paddingVertical: 1 },
  priorityTagText: { fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
});
