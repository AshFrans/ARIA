import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { fetchHoursData } from '../integrations/clockify';
import { spacing, fontSize, radius } from '../theme';

const REFRESH_INTERVAL = 60000;

export default function HoursCard({ clockifyKey, dailyGoal = 8, colors, refreshKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stopping, setStopping] = useState(false);
  const intervalRef = useRef(null);

  const load = async () => {
    if (!clockifyKey) {
      setError('No Clockify API key set. Add it in Settings.');
      setLoading(false);
      return;
    }
    try {
      const result = await fetchHoursData(clockifyKey);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, REFRESH_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [clockifyKey, refreshKey]);

  const handleStop = async () => {
    setStopping(true);
    try {
      const { createClockifyHandlers } = await import('../integrations/clockify');
      const handlers = createClockifyHandlers(clockifyKey);
      await handlers.clockify_stop_timer();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setStopping(false);
    }
  };

  const hours = data?.totalHours ?? 0;
  const pct = Math.min((hours / dailyGoal) * 100, 100);
  const current = data?.currentEntry;
  const goalReached = pct >= 100;

  // Segmented progress bar: 20 segments
  const SEGMENTS = 20;
  const filledSegments = Math.round((pct / 100) * SEGMENTS);

  const timerGlow = Platform.OS === 'web'
    ? { boxShadow: `0 0 12px ${colors.accent}44` }
    : {};

  return (
    <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.surface }]}>

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.titleBar, { backgroundColor: colors.accent }]} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TODAY'S HOURS</Text>
        </View>
        {current && (
          <View style={[styles.recBadge, { backgroundColor: colors.danger + '22', borderColor: colors.danger + '55' }]}>
            <View style={[styles.recDot, { backgroundColor: colors.danger }]} />
            <Text style={[styles.recText, { color: colors.danger }]}>REC</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : (
        <>
          {/* Big hours number */}
          <View style={styles.hoursRow}>
            <Text style={[styles.hoursNumber, { color: goalReached ? colors.accent : colors.accentText }]}>
              {hours.toFixed(1)}
            </Text>
            <View style={styles.hoursRight}>
              <Text style={[styles.hoursDenom, { color: colors.textTertiary }]}>/ {dailyGoal}h</Text>
              {goalReached && (
                <Text style={[styles.goalTag, { color: colors.accent }]}>COMPLETE</Text>
              )}
            </View>
          </View>

          {/* Segmented progress bar */}
          <View style={styles.segmentRow}>
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.segment,
                  {
                    backgroundColor: i < filledSegments
                      ? (goalReached ? colors.accent : colors.accent + 'CC')
                      : colors.surfaceAlt,
                    borderColor: i < filledSegments ? colors.accent + '44' : colors.border,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
            {goalReached ? `+${(hours - dailyGoal).toFixed(1)}h over goal` : `${(dailyGoal - hours).toFixed(1)}h remaining`}
          </Text>

          {/* Running timer */}
          {current ? (
            <View style={[styles.timerBox, { backgroundColor: colors.accentLight, borderColor: colors.border, ...timerGlow }]}>
              <View style={styles.timerRow}>
                <View style={[styles.dot, { backgroundColor: colors.danger }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timerProject, { color: colors.accentText }]} numberOfLines={1}>
                    {current.project}
                  </Text>
                  <Text style={[styles.timerDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {current.description}
                  </Text>
                </View>
                <Text style={[styles.timerElapsed, { color: colors.accent }]}>
                  {current.elapsed}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.stopBtn, { backgroundColor: colors.danger + '22', borderColor: colors.danger + '55' }]}
                onPress={handleStop}
                disabled={stopping}
              >
                <Text style={[styles.stopBtnText, { color: colors.danger }]}>
                  {stopping ? 'STOPPING…' : '■  STOP'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.noTimer, { color: colors.textTertiary }]}>_ no timer running</Text>
          )}
        </>
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
  recBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recDot: { width: 5, height: 5, borderRadius: 3 },
  recText: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  hoursNumber: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    lineHeight: fontSize.hero + 4,
    letterSpacing: -2,
  },
  hoursRight: { paddingBottom: 6, gap: 2 },
  hoursDenom: { fontSize: fontSize.md, fontWeight: '500' },
  goalTag: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  // Segmented bar
  segmentRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
    letterSpacing: 0.3,
  },

  // Timer
  timerBox: {
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: radius.full },
  timerProject: { fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 0.3 },
  timerDesc: { fontSize: fontSize.xs },
  timerElapsed: { fontSize: fontSize.sm, fontWeight: '800', letterSpacing: 0.5 },
  stopBtn: {
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  stopBtnText: { fontSize: fontSize.xs, fontWeight: '800', letterSpacing: 1.5 },
  noTimer: { fontSize: fontSize.xs, fontStyle: 'italic', letterSpacing: 0.3 },
  error: { fontSize: fontSize.sm, marginVertical: spacing.sm },
});
