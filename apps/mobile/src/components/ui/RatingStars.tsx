import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { useFormatters } from '@/hooks/useFormatters';
import { spacing } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

const STARS = [1, 2, 3, 4, 5] as const;

function starIcon(position: number, value: number): IconName {
  if (value >= position) return 'star';
  if (value >= position - 0.5) return 'star-half';
  return 'star-outline';
}

export type RatingStarsProps = {
  /** Note entre 0 et 5 (demi-étoiles affichées). */
  value: number;
  size?: number;
  /** Rend les étoiles sélectionnables (saisie d'un avis). */
  onChange?: (value: number) => void;
  accessibilityLabel?: string;
};

export function RatingStars({ value, size = 16, onChange, accessibilityLabel }: RatingStarsProps) {
  const { t } = useTranslation();
  const { rating } = useFormatters();

  if (!onChange) {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? t('rating.summaryA11y', { value: rating(value) })}
      >
        {STARS.map((position) => (
          <Icon
            key={position}
            name={starIcon(position, value)}
            size={size}
            color="accent"
            flipInRTL
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {STARS.map((position) => (
        <Pressable
          key={position}
          onPress={() => onChange(position)}
          accessibilityRole="radio"
          accessibilityState={{ checked: Math.round(value) === position }}
          accessibilityLabel={t('rating.star', { count: position })}
          hitSlop={6}
          style={styles.interactiveStar}
        >
          <Icon name={value >= position ? 'star' : 'star-outline'} size={size} color="accent" />
        </Pressable>
      ))}
    </View>
  );
}

export type RatingSummaryProps = {
  /** Moyenne réelle, ou null si aucun avis. Jamais de note fictive. */
  average: number | null;
  count: number;
};

/** Note moyenne + nombre réel d'avis, ou « Aucun avis pour le moment ». */
export function RatingSummary({ average, count }: RatingSummaryProps) {
  const { t } = useTranslation();
  const { rating } = useFormatters();

  if (count === 0 || average === null) {
    return (
      <Text variant="caption" color="textSecondary">
        {t('rating.noReviews')}
      </Text>
    );
  }

  return (
    <View
      style={styles.summary}
      accessible
      accessibilityLabel={`${t('rating.summaryA11y', { value: rating(average) })}, ${t('rating.reviews', { count })}`}
    >
      <Icon name="star" size={14} color="accent" />
      <Text variant="label">{rating(average)}</Text>
      <Text variant="caption" color="textSecondary">
        ({t('rating.reviews', { count })})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  interactiveStar: { padding: spacing.xxs },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
