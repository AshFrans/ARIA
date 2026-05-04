import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing, fontSize, radius } from '../theme';

export default function ServiceStatus({ services, colors }) {
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {services.map(({ label, connected }) => (
        <View key={label} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: connected ? colors.success : colors.textTertiary }]} />
          <Text style={[styles.label, { color: connected ? colors.textSecondary : colors.textTertiary }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, marginBottom: spacing.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: fontSize.xs },
});
