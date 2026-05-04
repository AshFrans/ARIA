import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { spacing, fontSize, radius } from '../theme';

export default function TabBar({ activeTab, onTabChange, colors }) {
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Work' && { backgroundColor: colors.accent }]}
          onPress={() => onTabChange('Work')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Work' }}
        >
          <Text style={[styles.label, { color: activeTab === 'Work' ? '#fff' : colors.textSecondary }]}>
            Work
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Personal' && { backgroundColor: colors.accent }]}
          onPress={() => onTabChange('Personal')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'Personal' }}
        >
          <Text style={[styles.label, { color: activeTab === 'Personal' ? '#fff' : colors.textSecondary }]}>
            Personal
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pill: {
    flexDirection: 'row',
    borderRadius: radius.full,
    padding: 3,
    alignSelf: 'center',
  },
  tab: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
