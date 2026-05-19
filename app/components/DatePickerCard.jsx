import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { spacing, fontSize, radius } from '../theme';

// Only import the native picker on native platforms — avoids web bundling issues
let DateTimePicker = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

function todayDate() {
  return new Date();
}

function isoFromDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function DatePickerCard({ prompt, onConfirm, onCancel, colors, ariaName }) {
  const [date, setDate] = useState(todayDate);
  // Android: the native dialog appears only when the user taps the date button,
  // so we track whether it's currently open.
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const handleNativeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (event.type === 'dismissed') return;
    }
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
          <Text style={styles.avatarText}>{ariaName?.[0] ?? 'A'}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.chatBubbleAria, borderColor: colors.border }]}>
          <Text style={[styles.prompt, { color: colors.chatTextAria }]}>{prompt}</Text>

          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={isoFromDate(date)}
              onChange={e => {
                const d = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(d)) setDate(d);
              }}
              style={{
                marginTop: 8,
                padding: '7px 10px',
                borderRadius: radius.sm,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.surfaceAlt,
                color: colors.text,
                fontSize: fontSize.sm,
                width: '100%',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          ) : (
            <>
              {/* Android: tap button to open the date dialog */}
              {Platform.OS === 'android' && (
                <TouchableOpacity
                  style={[styles.androidDateBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                  onPress={() => setShowPicker(true)}
                >
                  <Text style={[styles.androidDateText, { color: colors.text }]}>{formatDisplay(date)}</Text>
                  <Text style={[styles.androidDateIcon, { color: colors.accent }]}>📅</Text>
                </TouchableOpacity>
              )}

              {/* iOS: inline spinner; Android: modal dialog shown conditionally */}
              {showPicker && DateTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={handleNativeChange}
                  themeVariant={colors.text === '#f1f5f9' ? 'dark' : 'light'}
                  style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
                />
              )}
            </>
          )}

          {/* Human-readable preview (web + iOS only — Android shows it in the button) */}
          {Platform.OS !== 'android' && (
            <Text style={[styles.preview, { color: colors.textSecondary }]}>{formatDisplay(date)}</Text>
          )}

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.accent }]}
              onPress={() => onConfirm(isoFromDate(date))}
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  avatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  card: {
    flex: 1,
    borderRadius: radius.lg,
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.sm + 2,
    gap: spacing.xs,
  },
  prompt: { fontSize: fontSize.sm, fontWeight: '600', lineHeight: 20 },
  preview: { fontSize: fontSize.xs, marginTop: 2 },
  androidDateBtn: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  androidDateText: { fontSize: fontSize.sm, fontWeight: '500' },
  androidDateIcon: { fontSize: 16 },
  iosPicker: { marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  confirmBtn: {
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: fontSize.sm, fontWeight: '700' },
  cancelBtn: {
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: { fontSize: fontSize.sm, fontWeight: '600' },
});
