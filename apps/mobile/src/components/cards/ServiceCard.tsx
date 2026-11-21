import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useFormatters } from '@/hooks/useFormatters';
import { colors, radius, spacing } from '@/theme';

export type ServiceCardProps = {
  title: string;
  categoryLabel: string;
  icon: IconName;
  description?: string;
  /** Prix indicatif minimum (DZD) ; null = sur devis. */
  priceFrom?: number | null;
  onPress?: () => void;
};

export function ServiceCard({
  title,
  categoryLabel,
  icon,
  description,
  priceFrom,
  onPress,
}: ServiceCardProps) {
  const { t } = useTranslation();
  const { dzd } = useFormatters();
  const price =
    priceFrom === undefined || priceFrom === null
      ? t('service.priceOnQuote')
      : t('service.fromPrice', { amount: dzd(priceFrom) });

  return (
    <Card onPress={onPress} accessibilityLabel={`${title}, ${categoryLabel}, ${price}`}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Icon name={icon} size={24} color="primary" />
        </View>
        <View style={styles.body}>
          <Text variant="caption" color="primary" numberOfLines={1}>
            {categoryLabel}
          </Text>
          <Text variant="bodyStrong" numberOfLines={2}>
            {title}
          </Text>
          {description ? (
            <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
              {description}
            </Text>
          ) : null}
          <Text variant="label" color="primaryDark">
            {price}
          </Text>
        </View>
        {onPress ? <Icon name="chevron-forward" size={20} color="textSecondary" flipInRTL /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: spacing.xxs },
});
