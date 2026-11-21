import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
};

export function ScreenHeader({ title, subtitle, onBack, actions }: ScreenHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      {onBack ? (
        <IconButton
          icon="arrow-back"
          flipInRTL
          accessibilityLabel={t('common.back')}
          onPress={onBack}
        />
      ) : null}
      <View style={styles.titles}>
        <Text variant="h2" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
  },
  titles: { flex: 1, gap: spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
