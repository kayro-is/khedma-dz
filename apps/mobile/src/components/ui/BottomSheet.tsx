import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, durations, radius, shadows, spacing } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Hauteur maximale en proportion de l'écran. */
  maxHeightRatio?: number;
};

/**
 * Panneau glissant depuis le bas (choix, filtres, actions).
 * Le contenu reste monté pendant l'animation de fermeture.
 */
export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeightRatio = 0.85,
}: BottomSheetProps) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  // Monte immédiatement à l'ouverture ; le démontage attend la fin de l'animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(1, { duration: reduceMotion ? 0 : durations.normal }));
    } else {
      progress.set(
        withTiming(0, { duration: reduceMotion ? 0 : durations.fast }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, progress, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * height }],
  }));

  return (
    <RNModal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            { maxHeight: height * maxHeightRatio, paddingBottom: insets.bottom + spacing.lg },
            sheetStyle,
          ]}
        >
          <View style={styles.handle} />
          {title ? (
            <View style={styles.header}>
              <Text variant="h3" accessibilityRole="header" style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              <IconButton
                icon="close"
                size="sm"
                variant="tonal"
                accessibilityLabel={t('common.close')}
                onPress={onClose}
              />
            </View>
          ) : null}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.surface,
    borderTopStartRadius: radius.xl,
    borderTopEndRadius: radius.xl,
    paddingTop: spacing.sm,
    ...shadows.overlay,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.borderStrong,
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: { flex: 1 },
  content: { flexShrink: 1, paddingHorizontal: spacing.lg },
});
