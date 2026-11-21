import {
  Platform,
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { useDirection } from '@/hooks/useDirection';
import {
  colors,
  containsArabic,
  resolveTextAlign,
  textStyleFor,
  type ColorToken,
  type LogicalTextAlign,
  type TextVariant,
} from '@/theme';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: ColorToken;
  /** Alignement logique : `start` suit le sens de lecture (gauche en fr, droite en ar). */
  align?: LogicalTextAlign;
};

/**
 * Texte typographié : choisit Inter ou Noto Sans Arabic selon la langue de l'interface,
 * ou selon le contenu (un nom saisi en arabe s'affiche avec la police arabe même en français).
 */
export function Text({
  variant = 'body',
  color = 'textPrimary',
  align = 'start',
  style,
  children,
  ...rest
}: TextProps) {
  const { isRTL, script } = useDirection();
  const effectiveScript =
    typeof children === 'string' && containsArabic(children) ? 'arabic' : script;
  const textAlign = resolveTextAlign(align, Platform.OS, isRTL) as TextStyle['textAlign'];

  return (
    <RNText
      {...rest}
      style={[textStyleFor(variant, effectiveScript), { color: colors[color], textAlign }, style]}
    >
      {children}
    </RNText>
  );
}
