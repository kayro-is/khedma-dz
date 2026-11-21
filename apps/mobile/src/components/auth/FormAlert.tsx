import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, type ColorToken } from '@/theme';

type Tone = 'error' | 'info' | 'success';

const TONES: Record<
  Tone,
  { icon: IconName; color: ColorToken; background: string; border: string }
> = {
  error: { icon: 'alert-circle', color: 'error', background: colors.errorLight, border: '#F8C4C4' },
  info: {
    icon: 'information-circle',
    color: 'primaryDark',
    background: colors.primaryLight,
    border: '#BFE8CF',
  },
  success: {
    icon: 'checkmark-circle',
    color: 'success',
    background: colors.successLight,
    border: '#BBF7D0',
  },
};

export type FormAlertProps = {
  tone?: Tone;
  message: string;
  action?: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean };
};

/** Message de formulaire (erreur serveur, information) annoncé aux lecteurs d'écran. */
export function FormAlert({ tone = 'error', message, action }: FormAlertProps) {
  const reduceMotion = useReducedMotion();
  const t = TONES[tone];
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(180)}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      style={[styles.box, { backgroundColor: t.background, borderColor: t.border }]}
    >
      <View style={styles.row}>
        <Icon name={t.icon} size={20} color={t.color} />
        <Text variant="label" color={t.color} style={styles.message}>
          {message}
        </Text>
      </View>
      {action ? (
        <Button
          label={action.label}
          variant="ghost"
          size="sm"
          onPress={action.onPress}
          loading={action.loading}
          disabled={action.disabled}
          style={styles.action}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  message: { flex: 1 },
  action: { alignSelf: 'flex-end' },
});
