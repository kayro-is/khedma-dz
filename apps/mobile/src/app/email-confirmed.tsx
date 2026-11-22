import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { clearJustConfirmed } from '@/features/auth/pendingConfirmation';
import { BACK_FALLBACK, useSafeBack } from '@/lib/navigation';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * « Adresse e-mail confirmée ». Affiché uniquement après une confirmation établie par Supabase :
 * connexion acceptée depuis « J'ai confirmé mon e-mail », ou échange du code du lien réussi.
 * Avec une session valide : accès direct à l'application ; sinon : vers la connexion.
 */
export default function EmailConfirmedScreen() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const reduceMotion = useReducedMotion();
  const signedIn = status === 'signedIn';
  useSafeBack(signedIn ? BACK_FALLBACK.entry : BACK_FALLBACK.auth);
  // Affiché une seule fois.
  useEffect(() => clearJustConfirmed(), []);

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.content}>
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(360)}
        style={styles.card}
        accessibilityLiveRegion="polite"
      >
        <View style={styles.badge}>
          <Icon name="checkmark" size={44} color="onPrimary" />
        </View>
        <Text variant="h1" align="center" accessibilityRole="header">
          {t('auth.emailConfirmed.title')}
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          {t(signedIn ? 'auth.emailConfirmed.bodySignedIn' : 'auth.emailConfirmed.bodySignedOut')}
        </Text>
      </Animated.View>
      <Button
        label={t(signedIn ? 'auth.emailConfirmed.openApp' : 'auth.emailConfirmed.signIn')}
        size="lg"
        fullWidth
        iconEnd="arrow-forward"
        iconEndFlipInRTL
        onPress={() => router.replace(signedIn ? '/' : '/sign-in')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  card: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
