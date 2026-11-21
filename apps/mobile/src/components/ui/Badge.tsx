import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, type ColorToken } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'accent';

const TONES: Record<BadgeTone, { background: string; content: ColorToken }> = {
  neutral: { background: colors.surfaceMuted, content: 'textSecondary' },
  primary: { background: colors.primaryLight, content: 'primaryDark' },
  success: { background: colors.successLight, content: 'success' },
  warning: { background: colors.warningLight, content: 'warningDark' },
  error: { background: colors.errorLight, content: 'error' },
  accent: { background: colors.accentLight, content: 'warningDark' },
};

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
};

export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.background }]}>
      {icon ? <Icon name={icon} size={13} color={palette.content} /> : null}
      <Text variant="caption" color={palette.content} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Badge affiché uniquement lorsqu'une vérification a réellement été effectuée. */
export function VerifiedBadge() {
  const { t } = useTranslation();
  return <Badge label={t('badge.verified')} tone="primary" icon="shield-checkmark" />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
});
