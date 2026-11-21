import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { parseAuthCallback } from '@/features/auth/authCallback';
import { exchangeCode } from '@/features/auth/authService';
import { toast } from '@/store/toastStore';
import { colors, spacing } from '@/theme';

/**
 * Destination des liens reçus par e-mail (confirmation d'adresse, mot de passe oublié).
 * Le code n'est utilisable qu'une fois, et uniquement sur l'appareil qui a fait la demande (PKCE).
 */
export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const url = Linking.useLinkingURL();
  const params = useLocalSearchParams();
  const parsed = useMemo(
    () => parseAuthCallback(url, params as Record<string, string | string[] | undefined>),
    [url, params],
  );
  const [exchangeFailed, setExchangeFailed] = useState(false);
  const handled = useRef(false);

  // Lien d'erreur (expiré, déjà utilisé) ou vide : échec connu dès le rendu, sans appel réseau.
  // Un lien vide sans URL est toléré : l'URL complète peut arriver un instant plus tard.
  const failed =
    exchangeFailed || parsed.kind === 'error' || (parsed.kind === 'empty' && url !== null);

  useEffect(() => {
    if (parsed.kind !== 'code' || handled.current) return;
    handled.current = true; // un code ne s'échange qu'une fois
    void exchangeCode(parsed.code).then((result) => {
      if (!result.ok) {
        setExchangeFailed(true);
        return;
      }
      if (parsed.next === 'reset-password') {
        router.replace('/reset-password');
      } else {
        toast.success(t('auth.callback.confirmed'));
        router.replace('/');
      }
    });
  }, [parsed, t]);

  if (failed) {
    return (
      <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.center}>
        <EmptyState
          icon="link-outline"
          title={t('auth.callback.failedTitle')}
          description={t('auth.callback.failedBody')}
        />
        <Button
          label={t('auth.callback.goToSignIn')}
          size="lg"
          fullWidth
          onPress={() => router.replace('/sign-in')}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.center}>
      <View
        style={styles.loading}
        accessibilityRole="progressbar"
        accessibilityLabel={t('auth.callback.verifying')}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text variant="body" color="textSecondary" align="center">
          {t('auth.callback.verifying')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl },
  loading: { alignItems: 'center', gap: spacing.lg },
});
