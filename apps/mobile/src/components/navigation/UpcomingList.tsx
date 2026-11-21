import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme';

export type UpcomingItem = { key: string; icon: IconName; title: string; description: string };

/**
 * Liste des fonctionnalités à venir, clairement signalées « Bientôt » : rien n'est présenté
 * comme opérationnel avant sa livraison.
 */
export function UpcomingList({ title, items }: { title: string; items: readonly UpcomingItem[] }) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.list}>
        {items.map((item, index) => (
          <View
            key={item.key}
            style={[styles.row, index < items.length - 1 && styles.separator]}
            accessible
            accessibilityLabel={`${item.title}. ${item.description}. ${t('common.soon')}`}
          >
            <View style={styles.icon}>
              <Icon name={item.icon} size={20} color="textSecondary" />
            </View>
            <View style={styles.texts}>
              <Text variant="bodyStrong">{item.title}</Text>
              <Text variant="bodySmall" color="textSecondary">
                {item.description}
              </Text>
            </View>
            <Badge label={t('common.soon')} tone="neutral" />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  list: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  separator: { borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: spacing.xxs },
});
