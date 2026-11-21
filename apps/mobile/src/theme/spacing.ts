export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/** Taille minimale d'une zone tactile (recommandations Android / iOS). */
export const MIN_TOUCH_SIZE = 48;

export const durations = {
  fast: 120,
  normal: 220,
  slow: 320,
} as const;
