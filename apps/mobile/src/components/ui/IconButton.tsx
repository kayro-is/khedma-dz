import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, MIN_TOUCH_SIZE, radius, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export type IconButtonProps = {
  icon: IconName;
  /** Obligatoire : une icône seule n'a pas de nom pour les lecteurs d'écran. */
  accessibilityLabel: string;
  onPress?: () => void;
  variant?: 'plain' | 'tonal' | 'filled' | 'surface';
  size?: 'sm' | 'md';
  color?: ColorToken;
  flipInRTL?: boolean;
  disabled?: boolean;
  selected?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const BACKGROUNDS = {
  plain: 'transparent',
  tonal: colors.primaryLight,
  filled: colors.primary,
  surface: colors.surface,
} as const;

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'plain',
  size = 'md',
  color,
  flipInRTL,
  disabled = false,
  selected,
  testID,
  style,
}: IconButtonProps) {
  const dimension = size === 'sm' ? 36 : 44;
  const iconColor: ColorToken = color ?? (variant === 'filled' ? 'onPrimary' : 'textPrimary');
  // Zone tactile étendue à 48 px même pour les petits boutons.
  const slop = Math.max(0, (MIN_TOUCH_SIZE - dimension) / 2);

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop}
      scaleTo={0.9}
      style={[
        styles.base,
        { width: dimension, height: dimension, backgroundColor: BACKGROUNDS[variant] },
        variant === 'surface' && styles.surface,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Icon name={icon} size={size === 'sm' ? 18 : 22} color={iconColor} flipInRTL={flipInRTL} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  surface: { borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.4 },
});
