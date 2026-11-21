import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
};

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Icon name={icon} size={32} color="primary" />
      </View>
      <Text variant="h3" align="center" accessibilityRole="header">
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="textSecondary" align="center">
          {description}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          icon={action.icon}
          onPress={action.onPress}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  action: { alignSelf: 'center', marginTop: spacing.md },
});
