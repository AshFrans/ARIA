import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { spacing, fontSize, radius } from '../theme';

export default function TabBar({ activeTab, onTabChange, colors }) {
  return (
    <View style={[styles.container, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
      <View style={styles.tabRow}>
        {['Work', 'Personal'].map(tab => {
          const isActive = activeTab === tab;
          const webGlow = Platform.OS === 'web' && isActive
            ? { textShadow: `0 0 12px ${colors.accent}88` }
            : {};
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && { borderBottomColor: colors.accent }]}
              onPress={() => onTabChange(tab)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.tabInner}>
                {isActive && (
                  <Text style={[styles.prompt, { color: colors.accent }]}>▸ </Text>
                )}
                <Text style={[
                  styles.label,
                  { color: isActive ? colors.accent : colors.textTertiary, ...webGlow },
                  isActive && styles.labelActive,
                ]}>
                  {tab.toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  tabRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  tab: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prompt: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  labelActive: {
    fontWeight: '800',
  },
});
