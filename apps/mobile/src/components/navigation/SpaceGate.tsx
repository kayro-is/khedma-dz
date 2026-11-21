import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useSpace } from '@/features/space/SpaceProvider';
import { colors, spacing } from '@/theme';

/**
 * Écran d'entrée de l'espace connecté pendant la vérification du rôle ARTISAN.
 * - `verifying` : lecture en cours (court) ;
 * - `unverified` : serveur injoignable alors que le dernier espace était Artisan. L'espace Artisan
 *   n'est jamais ouvert sans confirmation : l'utilisateur réessaie ou continue en Particulier.
 */
export function SpaceGate({ kind }: { kind: 'verifying' | 'unverified' }) {
  const { t } = useTranslation();
  const { refreshRoles, rolesRefreshing, switchSpace } = useSpace();

  if (kind === 'verifying') {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.center}>
        <View
          style={styles.verifying}
          accessibilityLiveRegion="polite"
          accessibilityState={{ busy: true }}
        >
          <BrandMark size={56} />
          <ActivityIndicator color={colors.primary} />
          <Text variant="body" color="textSecondary" align="center">
            {t('space.gate.verifying')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.center}>
      <ErrorState
        kind="network"
        title={t('space.gate.unverifiedTitle')}
        description={t('space.gate.unverifiedBody')}
        onRetry={() => void refreshRoles()}
        retrying={rolesRefreshing}
      />
      <Button
        label={t('space.gate.continueParticulier')}
        variant="ghost"
        icon="home-outline"
        style={styles.secondary}
        onPress={() => void switchSpace('particulier')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, justifyContent: 'center' },
  verifying: { alignItems: 'center', gap: spacing.lg },
  secondary: { alignSelf: 'center', marginTop: spacing.sm },
});
