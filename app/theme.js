// Design system — spacing scale, colours, typography, shadows

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
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

// Steampunk / matrix dark theme — phosphor green + brass amber
export const dark = {
  background: '#090D09',
  surface: '#101610',
  surfaceAlt: '#182018',
  border: '#243B24',
  accent: '#3CCA78',           // phosphor terminal green
  accentLight: '#0B180B',      // very dark green for tinted backgrounds
  accentText: '#6EE7A0',       // lighter green for text
  text: '#C8E6C8',             // soft green-white
  textSecondary: '#6B9B6B',    // muted green
  textTertiary: '#3D5C3D',     // dark muted green
  danger: '#E06060',
  success: '#3CCA78',
  warning: '#C8892A',          // steampunk brass/amber
  warningLight: '#1E1608',     // dark amber tint
  shadow: '#000000',
  chatBubbleUser: '#163326',
  chatBubbleAria: '#182018',
  chatTextUser: '#C8E6C8',
  chatTextAria: '#C8E6C8',
  tabActive: '#3CCA78',
  tabInactive: '#3D5C3D',
  headerBg: '#0B110B',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#243B24',
  },
};

// Refined light theme — cohesive green family
export const light = {
  background: '#F2F7F2',
  surface: '#FFFFFF',
  surfaceAlt: '#EBF4EB',
  border: '#CCDECE',
  accent: '#2A7D4F',
  accentLight: '#EAF5EE',
  accentText: '#1B5E38',
  text: '#0C1C0C',
  textSecondary: '#3D6B45',
  textTertiary: '#8AAF8A',
  danger: '#D94040',
  success: '#2A7D4F',
  warning: '#9A6020',
  warningLight: '#FEF3E2',
  shadow: '#0C1C0C',
  chatBubbleUser: '#2A7D4F',
  chatBubbleAria: '#EAF5EE',
  chatTextUser: '#FFFFFF',
  chatTextAria: '#0C1C0C',
  tabActive: '#2A7D4F',
  tabInactive: '#8AAF8A',
  headerBg: '#FFFFFF',
  cardShadow: {
    shadowColor: '#0C1C0C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#CCDECE',
  },
};
