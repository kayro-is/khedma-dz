import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

export type SkeletonProps = {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Bloc animé (pulsation) ; statique si l'utilisateur a réduit les animations. */
export function Skeleton({
  width = '100%',
  height = 14,
  borderRadius = radius.xs,
  style,
}: SkeletonProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.set(withRepeat(withTiming(0.45, { duration: 750 }), -1, true));
    return () => cancelAnimation(opacity);
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: colors.skeleton },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Squelette d'une carte de liste (artisan, demande, notification). */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <View style={styles.lines}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" />
        <Skeleton width="55%" />
      </View>
    </View>
  );
}

export type LoadingSkeletonProps = {
  /** Nombre de cartes affichées pendant le chargement d'une liste. */
  count?: number;
};

/** Chargement progressif d'une liste, annoncé aux lecteurs d'écran. */
export function LoadingSkeleton({ count = 3 }: LoadingSkeletonProps) {
  const { t } = useTranslation();
  return (
    <View
      style={styles.list}
      accessible
      accessibilityLabel={t('common.loading')}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lines: { flex: 1, gap: spacing.sm, justifyContent: 'center' },
});
