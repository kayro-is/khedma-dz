import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { RequestUrgency, ServiceRequestStatus } from '@khedma/types';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { REQUEST_STATUS_TONE, URGENCY_TONE } from '@/features/status/statusTones';
import { useFormatters } from '@/hooks/useFormatters';
import { colors, spacing } from '@/theme';

export type RequestCardProps = {
  title: string;
  categoryLabel: string;
  /** Commune uniquement : l'adresse exacte n'est jamais affichée. */
  commune: string;
  createdAt: Date | string;
  status: ServiceRequestStatus;
  urgency: RequestUrgency;
  budget?: number | null;
  /** Masqué si non fourni (ex. vue artisan). */
  proposalsCount?: number;
  onPress?: () => void;
};

export function RequestCard({
  title,
  categoryLabel,
  commune,
  createdAt,
  status,
  urgency,
  budget,
  proposalsCount,
  onPress,
}: RequestCardProps) {
  const { t } = useTranslation();
  const { dzd, dayOrTime } = useFormatters();

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${title}, ${categoryLabel}, ${t(`requestStatus.${status}`)}`}
    >
      <View style={styles.header}>
        <Text variant="caption" color="primary" numberOfLines={1} style={styles.flex}>
          {categoryLabel}
        </Text>
        <Badge label={t(`requestStatus.${status}`)} tone={REQUEST_STATUS_TONE[status]} />
      </View>

      <Text variant="h3" numberOfLines={2} style={styles.title}>
        {title}
      </Text>

      <View style={styles.meta}>
        <Icon name="location-outline" size={14} color="textSecondary" />
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {commune}
        </Text>
        <Text variant="caption" color="textSecondary">
          ·
        </Text>
        <Icon name="time-outline" size={14} color="textSecondary" />
        <Text variant="caption" color="textSecondary">
          {dayOrTime(createdAt)}
        </Text>
      </View>

      <View style={styles.footer}>
        <Badge
          label={t(`urgency.${urgency}`)}
          tone={URGENCY_TONE[urgency]}
          icon={urgency === 'URGENT' ? 'flash' : undefined}
        />
        <Text variant="label" color="textSecondary" numberOfLines={1} style={styles.flex}>
          {budget === undefined || budget === null
            ? t('request.noBudget')
            : t('request.budget', { amount: dzd(budget) })}
        </Text>
        {proposalsCount !== undefined ? (
          <Text variant="label" color={proposalsCount > 0 ? 'primary' : 'textSecondary'}>
            {proposalsCount > 0
              ? t('request.proposals', { count: proposalsCount })
              : t('request.noProposals')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  title: { marginTop: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
