/** Palette Khedma DZ (cahier des charges, section 2) + nuances dérivées. */
export const colors = {
  primary: '#087F59',
  primaryDark: '#045C42',
  primaryLight: '#E0F7E8',
  background: '#F6FAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF4F1',
  textPrimary: '#10251B',
  textSecondary: '#557064',
  textDisabled: '#9BB0A6',
  border: '#E2EBE6',
  borderStrong: '#C9D8D0',
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#92400E',
  error: '#DC2626',
  errorLight: '#FEE2E2',
  accent: '#F5B301',
  accentLight: '#FFF6D6',
  onPrimary: '#FFFFFF',
  overlay: 'rgba(16, 37, 27, 0.45)',
  skeleton: '#E4ECE8',
} as const;

export type ColorToken = keyof typeof colors;
