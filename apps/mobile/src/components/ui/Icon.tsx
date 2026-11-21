import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useDirection } from '@/hooks/useDirection';
import { colors, type ColorToken } from '@/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorToken;
  /** Icônes directionnelles (flèches, chevrons, envoi, demi-étoile) : inversées en arabe. */
  flipInRTL?: boolean;
};

/** Icône décorative : masquée des lecteurs d'écran (le libellé est porté par le parent). */
export function Icon({ name, size = 20, color = 'textPrimary', flipInRTL = false }: IconProps) {
  const { isRTL } = useDirection();
  return (
    <Ionicons
      name={name}
      size={size}
      color={colors[color]}
      accessible={false}
      importantForAccessibility="no"
      style={flipInRTL && isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
    />
  );
}
