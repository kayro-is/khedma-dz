import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore, type ToastType } from '@/store/toastStore';
import { colors, radius, shadows, spacing, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const APPEARANCE: Record<ToastType, { icon: IconName; color: ColorToken; background: string }> = {
  success: { icon: 'checkmark-circle', color: 'success', background: colors.successLight },
  error: { icon: 'alert-circle', color: 'error', background: colors.errorLight },
  info: { icon: 'information-circle', color: 'primary', background: colors.primaryLight },
};

/** À monter une seule fois, à la racine de l'application. Utiliser `toast.success(...)` pour afficher. */
export function ToastHost() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const current = useToastStore((state) => state.current);
  const hide = useToastStore((state) => state.hide);

  useEffect(() => {
    if (!current) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    const timer = setTimeout(() => hide(current.id), current.durationMs);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;
  const appearance = APPEARANCE[current.type];

  return (
    <Animated.View
      key={current.id}
      entering={reduceMotion ? undefined : FadeInUp.duration(220)}
      exiting={reduceMotion ? undefined : FadeOutUp.duration(160)}
      style={[styles.container, { top: insets.top + spacing.sm }]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={() => hide(current.id)}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityHint={t('toast.dismiss')}
        style={[styles.toast, { backgroundColor: appearance.background }]}
      >
        <Icon name={appearance.icon} size={22} color={appearance.color} />
        <Text variant="label" style={styles.message}>
          {current.message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', start: spacing.lg, end: spacing.lg, zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.raised,
  },
  message: { flex: 1 },
});
