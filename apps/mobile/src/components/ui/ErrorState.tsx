import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

export type ErrorStateProps = {
  /** `network` : message explicite hors connexion. */
  kind?: 'generic' | 'network';
  title?: string;
  description?: string;
  onRetry?: () => void;
  retrying?: boolean;
};

export function ErrorState({
  kind = 'generic',
  title,
  description,
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const isNetwork = kind === 'network';

  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Icon
          name={isNetwork ? 'cloud-offline-outline' : 'alert-circle-outline'}
          size={32}
          color="error"
        />
      </View>
      <Text variant="h3" align="center">
        {title ?? t(isNetwork ? 'error.networkTitle' : 'error.title')}
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {description ?? t(isNetwork ? 'error.networkDescription' : 'error.description')}
      </Text>
      {onRetry ? (
        <Button
          label={t('common.retry')}
          icon="refresh"
          variant="secondary"
          loading={retrying}
          onPress={onRetry}
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
    backgroundColor: colors.errorLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  action: { alignSelf: 'center', marginTop: spacing.md },
});
