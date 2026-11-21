import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, spacing, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** Icône au début (côté lecture) ; `iconFlipInRTL` pour les flèches. */
  icon?: IconName;
  iconFlipInRTL?: boolean;
  /** Icône à la fin ; `iconEndFlipInRTL` pour les flèches. */
  iconEnd?: IconName;
  iconEndFlipInRTL?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const HEIGHTS: Record<ButtonSize, number> = { sm: 40, md: 48, lg: 56 };

const VARIANTS: Record<ButtonVariant, { background: string; border: string; content: ColorToken }> =
  {
    primary: { background: colors.primary, border: colors.primary, content: 'onPrimary' },
    secondary: { background: colors.surface, border: colors.primary, content: 'primary' },
    ghost: { background: 'transparent', border: 'transparent', content: 'primary' },
    danger: { background: colors.error, border: colors.error, content: 'onPrimary' },
  };

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconFlipInRTL,
  iconEnd,
  iconEndFlipInRTL = false,
  fullWidth = false,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const palette = VARIANTS[variant];
  const inactive = disabled || loading;
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={[
        styles.base,
        {
          minHeight: HEIGHTS[size],
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[palette.content]} />
      ) : (
        <View style={styles.content}>
          {icon ? (
            <Icon name={icon} size={iconSize} color={palette.content} flipInRTL={iconFlipInRTL} />
          ) : null}
          <Text
            variant={size === 'sm' ? 'label' : 'button'}
            color={palette.content}
            align="center"
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconEnd ? (
            <Icon
              name={iconEnd}
              size={iconSize}
              color={palette.content}
              flipInRTL={iconEndFlipInRTL}
            />
          ) : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
