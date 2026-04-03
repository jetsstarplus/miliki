export const Colors = {
  primary: '#0D5FA6',
  primaryDark: '#0A4A82',
  primaryLight: '#3B82C4',
  secondary: '#17B0E8',
  background: '#E8F3FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F4F8FD',
  text: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#C9DFF2',
  borderLight: '#E0EEF9',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  inputBackground: '#F0F7FD',
  overlay: 'rgba(13, 95, 166, 0.08)',
};

export const Typography = {
  fontSizeXs: 11,
  fontSizeSm: 13,
  fontSizeMd: 15,
  fontSizeLg: 17,
  fontSizeXl: 20,
  fontSize2xl: 24,
  fontSize3xl: 30,
  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemibold: '600' as const,
  fontWeightBold: '700' as const,
  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor: '#0D5FA6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#0D5FA6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0D5FA6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
};
