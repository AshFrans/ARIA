import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchMonthData } from '../integrations/clockify';
import { spacing, fontSize, radius } from '../theme';

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const PRIORITY_BG = { high: '#fef2f2', medium: '#fffbeb', low: '#f0fdf4' };
const PRIORITY_FG = { high: '#b91c1c', medium: '#92400e', low: '#166534' };

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

  // Group incomplete todos by due date
  const todosByDate = {};
  for (const t of todos) {
    if (!t.completed && t.due) {
      (todosByDate[t.due] = todosByDate[t.due] || []).push(t);
    }
  }

  // Build grid cells (nulls for leading empty slots)
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, ds });
  }

  const selDate = selectedDay ? new Date(selectedDay + 'T12:00:00') : null;
  const selTodos = selectedDay ? (todosByDate[selectedDay] || []) : [];
  const selHours = selectedDay ? (monthHours[selectedDay] || 0) : 0;

  return (
    <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CALENDAR</Text>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
          </TouchableOpacity>
        </View>
        {loading
          ? <ActivityIndicator size="small" color={colors.accent} />
          : <View style={{ width: 16 }} />
        }
      </View>

      {/* Day-of-week labels */}
      <View style={styles.grid}>
        {DAY_LABELS.map(l => (
          <View key={l} style={styles.cell}>
            <Text style={[styles.dayLabel, { color: colors.textTertiary }]}>{l}</Text>
          </View>
        ))}

        {/* Day cells */}
        {cells.map((cell, idx) => {
          if (!cell) return <View key={`e${idx}`} style={styles.cell} />;
          const isToday = cell.ds === todayStr;
          const isSel = cell.ds === selectedDay;
          const hasHours = !!monthHours[cell.ds];
          const hasTodo = !!todosByDate[cell.ds];
          const isPast = cell.ds < todayStr && !isToday;
          const isOverdue = isPast && hasTodo;

          return (
            <TouchableOpacity
              key={cell.ds}
              style={styles.cell}
              onPress={() => setSelectedDay(isSel ? null : cell.ds)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.dayCircle,
                isToday && { backgroundColor: colors.accent },
                isSel && !isToday && { backgroundColor: colors.accentLight, borderColor: colors.accent, borderWidth: 1.5 },
              ]}>
                <Text style={[
                  styles.dayNum,
                  { color: isToday ? '#fff' : isSel ? colors.accentText : isPast ? colors.textTertiary : colors.text },
                ]}>
                  {cell.day}
                </Text>
              </View>
              <View style={styles.dotRow}>
                {hasHours && <View style={[styles.dot, { backgroundColor: colors.success }]} />}
                {hasTodo && <View style={[styles.dot, { backgroundColor: isOverdue ? colors.danger : colors.warning }]} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {clockifyKey && (
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.success }]} />
            <Text style={[styles.legendText, { color: colors.textTertiary }]}>Time logged</Text>
          </View>
        )}
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Due</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <Text style={[styles.legendText, { color: colors.textTertiary }]}>Overdue</Text>
        </View>
      </View>

      {/* Selected day detail */}
      {selectedDay && (
        <View style={[styles.detail, { borderTopColor: colors.border }]}>
          <Text style={[styles.detailHeading, { color: colors.text }]}>
            {selDate
              ? selDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : selectedDay}
          </Text>

          {clockifyKey && (
            <Text style={[styles.detailHours, { color: selHours > 0 ? colors.success : colors.textTertiary }]}>
              {selHours > 0 ? `${selHours.toFixed(1)}h logged` : 'No time logged'}
            </Text>
          )}

          {selTodos.length > 0 ? (
            <View style={styles.detailTodos}>
              {selTodos.map(t => (
                <View key={t.id} style={styles.detailTodoRow}>
                  <Text style={[styles.detailBullet, { color: colors.warning }]}>•</Text>
                  <Text style={[styles.detailTodoText, { color: colors.text }]} numberOfLines={2}>
                    {t.text}
                  </Text>
                  {t.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_BG[t.priority] }]}>
                      <Text style={[styles.priorityText, { color: PRIORITY_FG[t.priority] }]}>
                        {t.priority}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.detailEmpty, { color: colors.textTertiary }]}>No todos due</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 1 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navArrow: { fontSize: 24, fontWeight: '300', lineHeight: 28 },
  monthLabel: { fontSize: fontSize.sm, fontWeight: '600', minWidth: 140, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', alignItems: 'center', paddingVertical: spacing.xs },
  dayLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 12, fontWeight: '500' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 2, height: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
    flexWrap: 'wrap',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: fontSize.xs },
  detail: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
  },
  detailHeading: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: 2 },
  detailHours: { fontSize: fontSize.xs, fontWeight: '700' },
  detailTodos: { gap: 4, marginTop: 2 },
  detailTodoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailBullet: { fontSize: fontSize.md, lineHeight: 18 },
  detailTodoText: { fontSize: fontSize.xs, flex: 1, lineHeight: 18 },
  priorityBadge: { borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 1 },
  priorityText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  detailEmpty: { fontSize: fontSize.xs, fontStyle: 'italic', marginTop: 2 },
});
