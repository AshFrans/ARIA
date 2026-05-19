// Design system — spacing, typography, and theme palettes

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

// ─── Matrix ──────────────────────────────────────────────────────────────────
// Classic terminal. Phosphor green on near-black.
export const matrix = {
  background: '#040804',
  surface: '#080F08',
  surfaceAlt: '#0F1A0F',
  border: '#1A2E1A',
  accent: '#00CC44',
  accentLight: '#061206',
  accentText: '#33EE66',
  text: '#88DD88',
  textSecondary: '#4A8A4A',
  textTertiary: '#2A502A',
  danger: '#CC4444',
  success: '#00CC44',
  warning: '#AACC00',
  warningLight: '#111800',
  shadow: '#000000',
  chatBubbleUser: '#0A2A10',
  chatBubbleAria: '#0F1A0F',
  chatTextUser: '#88DD88',
  chatTextAria: '#88DD88',
  tabActive: '#00CC44',
  tabInactive: '#2A502A',
  headerBg: '#050A05',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#1A2E1A',
  },
};

// ─── Steampunk ────────────────────────────────────────────────────────────────
// Aged brass and copper on dark mahogany.
export const steampunk = {
  background: '#0D0905',
  surface: '#181208',
  surfaceAlt: '#221A0C',
  border: '#3D2C10',
  accent: '#CC8822',
  accentLight: '#1C1408',
  accentText: '#E8A840',
  text: '#E8D4A0',
  textSecondary: '#A07838',
  textTertiary: '#604820',
  danger: '#C04030',
  success: '#5A9040',
  warning: '#CC5520',
  warningLight: '#1E1008',
  shadow: '#000000',
  chatBubbleUser: '#2A1C08',
  chatBubbleAria: '#221A0C',
  chatTextUser: '#E8D4A0',
  chatTextAria: '#E8D4A0',
  tabActive: '#CC8822',
  tabInactive: '#604820',
  headerBg: '#0F0B06',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#3D2C10',
  },
};

// ─── Cyberpunk ────────────────────────────────────────────────────────────────
// Electric teal and neon on deep navy. Blade Runner / Tron.
export const cyberpunk = {
  background: '#06060E',
  surface: '#0C0C1C',
  surfaceAlt: '#141428',
  border: '#1E1E3A',
  accent: '#00DDCC',
  accentLight: '#060E0E',
  accentText: '#44EEE0',
  text: '#C0D4F4',
  textSecondary: '#5878AA',
  textTertiary: '#303860',
  danger: '#FF2266',
  success: '#00DDCC',
  warning: '#FF6030',
  warningLight: '#160A06',
  shadow: '#000000',
  chatBubbleUser: '#0A2030',
  chatBubbleAria: '#141428',
  chatTextUser: '#C0D4F4',
  chatTextAria: '#C0D4F4',
  tabActive: '#00DDCC',
  tabInactive: '#303860',
  headerBg: '#080810',
  cardShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#1E1E3A',
  },
};

// ─── Light ────────────────────────────────────────────────────────────────────
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

// Backward-compat alias
export const dark = matrix;

export const THEMES = { matrix, steampunk, cyberpunk, light };

export const THEME_META = [
  {
    key: 'matrix',
    name: 'MATRIX',
    desc: 'Terminal green on black',
    preview: { bg: '#080F08', accent: '#00CC44', secondary: '#AACC00' },
  },
  {
    key: 'steampunk',
    name: 'STEAMPUNK',
    desc: 'Brass & copper on mahogany',
    preview: { bg: '#181208', accent: '#CC8822', secondary: '#CC5520' },
  },
  {
    key: 'cyberpunk',
    name: 'CYBERPUNK',
    desc: 'Electric teal on deep navy',
    preview: { bg: '#0C0C1C', accent: '#00DDCC', secondary: '#FF2266' },
  },
  {
    key: 'light',
    name: 'LIGHT',
    desc: 'Clean forest green',
    preview: { bg: '#F2F7F2', accent: '#2A7D4F', secondary: '#9A6020' },
  },
];
