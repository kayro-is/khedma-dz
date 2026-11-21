import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

import { PressableScale } from './PressableScale';

export type CardProps = {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  padding?: keyof typeof spacing | 0;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  padding = 'lg',
  style,
  testID,
}: CardProps) {
  const cardStyle = [styles.card, { padding: padding === 0 ? 0 : spacing[padding] }, style];

  if (!onPress) {
    return (
      <View style={cardStyle} testID={testID}>
        {children}
      </View>
    );
  }
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      scaleTo={0.985}
      style={cardStyle}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
});
