import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ProposalStatus } from '@khedma/types';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RatingSummary } from '@/components/ui/RatingStars';
import { Text } from '@/components/ui/Text';
import { PROPOSAL_STATUS_TONE } from '@/features/status/statusTones';
import { useFormatters } from '@/hooks/useFormatters';
import { colors, spacing } from '@/theme';

export type ProposalCardProps = {
  artisanName: string;
  artisanPhotoUrl?: string | null;
  artisanVerified: boolean;
  ratingAverage: number | null;
  reviewCount: number;
  /** Montant en DZD (numérique). */
  amount: number;
  estimatedDays: number;
  message: string;
  status: ProposalStatus;
  onPressProfile?: () => void;
  /** Actions affichées uniquement pour une proposition en attente. */
  onAccept?: () => void;
  onReject?: () => void;
  onDiscuss?: () => void;
  accepting?: boolean;
};

export function ProposalCard({
  artisanName,
  artisanPhotoUrl,
  artisanVerified,
  ratingAverage,
  reviewCount,
  amount,
  estimatedDays,
  message,
  status,
  onPressProfile,
  onAccept,
  onReject,
  onDiscuss,
  accepting = false,
}: ProposalCardProps) {
  const { t } = useTranslation();
  const { dzd } = useFormatters();
  const pending = status === 'PENDING';

  return (
    <Card>
      <Pressable
        onPress={onPressProfile}
        disabled={!onPressProfile}
        accessibilityRole={onPressProfile ? 'button' : undefined}
        accessibilityHint={onPressProfile ? t('proposal.viewProfile') : undefined}
        style={styles.header}
      >
        <Avatar name={artisanName} uri={artisanPhotoUrl} size={48} verified={artisanVerified} />
        <View style={styles.flex}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {artisanName}
          </Text>
          <RatingSummary average={ratingAverage} count={reviewCount} />
        </View>
        <Badge label={t(`proposalStatus.${status}`)} tone={PROPOSAL_STATUS_TONE[status]} />
      </Pressable>

      <View style={styles.amountRow}>
        <Text variant="h2" color="primaryDark">
          {dzd(amount)}
        </Text>
        <Text variant="label" color="textSecondary">
          {t('proposal.delay', { count: estimatedDays })}
        </Text>
      </View>

      <Text variant="body" color="textSecondary" numberOfLines={4}>
        {message}
      </Text>

      {pending && (onAccept || onReject || onDiscuss) ? (
        <View style={styles.actions}>
          {onDiscuss ? (
            <Button
              label={t('proposal.discuss')}
              icon="chatbubble-outline"
              variant="ghost"
              size="sm"
              onPress={onDiscuss}
            />
          ) : null}
          <View style={styles.flex} />
          {onReject ? (
            <Button
              label={t('proposal.reject')}
              variant="secondary"
              size="sm"
              onPress={onReject}
              disabled={accepting}
            />
          ) : null}
          {onAccept ? (
            <Button label={t('proposal.accept')} size="sm" onPress={onAccept} loading={accepting} />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  actions: {
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
