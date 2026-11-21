import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { VerifiedBadge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { RatingSummary } from '@/components/ui/RatingStars';
import { Text } from '@/components/ui/Text';
import { useFormatters } from '@/hooks/useFormatters';
import { spacing } from '@/theme';

export type ArtisanCardProps = {
  displayName: string;
  trade: string;
  photoUrl?: string | null;
  /** Moyenne réelle ou null : un nouvel artisan apparaît sans note. */
  ratingAverage: number | null;
  reviewCount: number;
  commune: string;
  /** Distance calculée côté serveur ; affichée de façon approximative. */
  distanceKm?: number | null;
  /** Vrai uniquement si une vérification a effectivement été réalisée. */
  verified: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
};

export function ArtisanCard({
  displayName,
  trade,
  photoUrl,
  ratingAverage,
  reviewCount,
  commune,
  distanceKm,
  verified,
  isFavorite = false,
  onToggleFavorite,
  onPress,
}: ArtisanCardProps) {
  const { t } = useTranslation();
  const { distance } = useFormatters();
  const location =
    distanceKm === undefined || distanceKm === null
      ? commune
      : `${commune} · ${distance(distanceKm)}`;

  return (
    <Card onPress={onPress} accessibilityLabel={`${displayName}, ${trade}, ${location}`}>
      <View style={styles.row}>
        <Avatar name={displayName} uri={photoUrl} size={60} verified={verified} />
        <View style={styles.body}>
          <Text variant="h3" numberOfLines={1}>
            {displayName}
          </Text>
          <Text variant="bodySmall" color="textSecondary" numberOfLines={1}>
            {trade}
          </Text>
          <RatingSummary average={ratingAverage} count={reviewCount} />
          <View style={styles.meta}>
            <Icon name="location-outline" size={14} color="textSecondary" />
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.flex}>
              {location}
            </Text>
          </View>
          {verified ? <VerifiedBadge /> : null}
        </View>
        {onToggleFavorite ? (
          <IconButton
            icon={isFavorite ? 'heart' : 'heart-outline'}
            color={isFavorite ? 'error' : 'textSecondary'}
            selected={isFavorite}
            accessibilityLabel={t(isFavorite ? 'artisan.favoriteRemove' : 'artisan.favoriteAdd')}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              onToggleFavorite();
            }}
          />
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  body: { flex: 1, gap: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
});
