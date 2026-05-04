// Design system — spacing scale, colours, typography, shadows
// Usage: const { colors, spacing, text } = useTheme();

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 32,
  hero: 48,
};

export const light = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  accent: '#6366f1',
  accentLight: '#eef2ff',
  accentText: '#4338ca',
  text: '#0f172a',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  shadow: '#0f172a',
  chatBubbleUser: '#6366f1',
  chatBubbleAria: '#eef2ff',
  chatTextUser: '#ffffff',
  chatTextAria: '#0f172a',
  tabActive: '#6366f1',
  tabInactive: '#94a3b8',
  headerBg: '#ffffff',
  cardShadow: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const dark = {
  background: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: '#334155',
  border: '#334155',
  accent: '#818cf8',
  accentLight: '#1e1b4b',
  accentText: '#a5b4fc',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textTertiary: '#64748b',
  danger: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
  shadow: '#000000',
  chatBubbleUser: '#6366f1',
  chatBubbleAria: '#252f4a',
  chatTextUser: '#ffffff',
  chatTextAria: '#f1f5f9',
  tabActive: '#818cf8',
  tabInactive: '#64748b',
  headerBg: '#1e293b',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};
