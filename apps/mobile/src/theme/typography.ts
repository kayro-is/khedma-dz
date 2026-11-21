import type { TextStyle } from 'react-native';

/**
 * Inter pour l'alphabet latin, Noto Sans Arabic pour l'arabe.
 * Sous Android, une police personnalisée ne gère pas `fontWeight` :
 * chaque graisse est une famille distincte.
 */
export const fontFamilies = {
  latin: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
  arabic: {
    regular: 'NotoSansArabic_400Regular',
    medium: 'NotoSansArabic_500Medium',
    semibold: 'NotoSansArabic_600SemiBold',
    bold: 'NotoSansArabic_700Bold',
  },
} as const;

export type Script = keyof typeof fontFamilies;
export type FontWeightName = keyof (typeof fontFamilies)['latin'];

type VariantSpec = { size: number; weight: FontWeightName };

export const textVariants = {
  display: { size: 28, weight: 'bold' },
  h1: { size: 24, weight: 'bold' },
  h2: { size: 20, weight: 'semibold' },
  h3: { size: 17, weight: 'semibold' },
  body: { size: 15, weight: 'regular' },
  bodyStrong: { size: 15, weight: 'semibold' },
  bodySmall: { size: 13, weight: 'regular' },
  label: { size: 14, weight: 'medium' },
  caption: { size: 12, weight: 'medium' },
  button: { size: 16, weight: 'semibold' },
} as const satisfies Record<string, VariantSpec>;

export type TextVariant = keyof typeof textVariants;

// L'arabe (Noto Sans Arabic) a des ascendantes/descendantes plus hautes : interligne plus grand.
const LINE_HEIGHT_RATIO: Record<Script, number> = { latin: 1.4, arabic: 1.65 };

export function fontFamilyFor(script: Script, weight: FontWeightName): string {
  return fontFamilies[script][weight];
}

export function textStyleFor(variant: TextVariant, script: Script): TextStyle {
  const { size, weight } = textVariants[variant];
  return {
    fontFamily: fontFamilyFor(script, weight),
    fontSize: size,
    lineHeight: Math.round(size * LINE_HEIGHT_RATIO[script]),
  };
}

const ARABIC_CHARS = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** Vrai si le texte contient des caractères arabes (ex. nom saisi en arabe dans l'interface française). */
export function containsArabic(text: string): boolean {
  return ARABIC_CHARS.test(text);
}
