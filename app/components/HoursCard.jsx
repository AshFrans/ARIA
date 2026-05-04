import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchHoursData } from '../integrations/clockify';
import { spacing, fontSize, radius } from '../theme';

const REFRESH_INTERVAL = 60000; // 60 seconds

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

  return (
    <View style={[styles.card, colors.cardShadow, { backgroundColor: colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TODAY'S HOURS</Text>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.lg }} />
      ) : error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : (
        <>
          <View style={styles.hoursRow}>
            <Text style={[styles.hoursNumber, { color: colors.text }]}>
              {hours.toFixed(1)}
            </Text>
            <Text style={[styles.hoursUnit, { color: colors.textSecondary }]}>
              {' '}/ {dailyGoal}h
            </Text>
          </View>

          {/* Progress bar */}
          <View style={[styles.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${pct}%`,
                  backgroundColor: pct >= 100 ? colors.success : colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.textTertiary }]}>
            {pct >= 100 ? 'Goal reached!' : `${(dailyGoal - hours).toFixed(1)}h remaining`}
          </Text>

          {/* Running timer */}
          {current ? (
            <View style={[styles.timerBox, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}>
              <View style={styles.timerRow}>
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timerProject, { color: colors.accentText }]} numberOfLines={1}>
                    {current.project}
                  </Text>
                  <Text style={[styles.timerDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {current.description}
                  </Text>
                </View>
                <Text style={[styles.timerElapsed, { color: colors.accentText }]}>
                  {current.elapsed}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.stopBtn, { backgroundColor: colors.danger }]}
                onPress={handleStop}
                disabled={stopping}
              >
                <Text style={styles.stopBtnText}>{stopping ? 'Stopping…' : 'Stop'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={[styles.noTimer, { color: colors.textTertiary }]}>No timer running</Text>
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
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  hoursNumber: {
    fontSize: fontSize.hero,
    fontWeight: '800',
    lineHeight: fontSize.hero + 8,
  },
  hoursUnit: {
    fontSize: fontSize.lg,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  progressLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
  },
  timerBox: {
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
  },
  timerProject: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  timerDesc: {
    fontSize: fontSize.xs,
  },
  timerElapsed: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  stopBtn: {
    borderRadius: radius.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  stopBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  noTimer: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  error: {
    fontSize: fontSize.sm,
    marginVertical: spacing.sm,
  },
});
