import type { ViewStyle } from 'react-native';

// `boxShadow` est supporté nativement sur Android et iOS par la nouvelle architecture React Native.
export const shadows = {
  none: {},
  card: { boxShadow: '0px 2px 8px rgba(16, 37, 27, 0.06)' },
  raised: { boxShadow: '0px 6px 18px rgba(16, 37, 27, 0.10)' },
  overlay: { boxShadow: '0px -4px 24px rgba(16, 37, 27, 0.16)' },
} as const satisfies Record<string, ViewStyle>;

export type ShadowToken = keyof typeof shadows;
