import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert } from '@/components/auth/FormAlert';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import type { AuthErrorKey } from '@/features/auth/authErrors';
import { requestPasswordReset, resendConfirmation, signIn } from '@/features/auth/authService';
import {
  CONFIRMATION_CHECK_COOLDOWN_SECONDS,
  clearPendingConfirmation,
  confirmationOutcome,
  markJustConfirmed,
  pendingCredentials,
  type ConfirmationOutcome,
} from '@/features/auth/pendingConfirmation';
import { toast } from '@/store/toastStore';
import { colors, radius, spacing } from '@/theme';

// Aligné sur la fréquence maximale d'envoi d'e-mails configurée dans Supabase (1 minute).
const RESEND_COOLDOWN_SECONDS = 60;

function useCountdown(initial: number) {
  const [seconds, setSeconds] = useState(initial);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  return [seconds, setSeconds] as const;
}

/**
 * « Vérifiez votre boîte e-mail » (inscription ou mot de passe oublié).
 * Après inscription, « J'ai confirmé mon e-mail » interroge Supabase (aucun succès simulé) :
 * l'adresse n'est considérée confirmée que si Supabase accepte la connexion.
 */
export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string; email?: string }>();
  const mode = params.mode === 'reset' ? 'reset' : 'signup';
  const email = typeof params.email === 'string' ? params.email : '';

  const [resendCooldown, setResendCooldown] = useCountdown(RESEND_COOLDOWN_SECONDS);
  const [checkCooldown, setCheckCooldown] = useCountdown(0);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [outcome, setOutcome] = useState<ConfirmationOutcome | null>(null);

  // Les identifiants gardés en mémoire sont effacés dès que l'on quitte cet écran.
  useEffect(() => () => clearPendingConfirmation(), []);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    setError(null);
    const result =
      mode === 'reset' ? await requestPasswordReset(email) : await resendConfirmation(email);
    setSending(false);
    if (result.ok) {
      toast.success(t('auth.checkEmail.resent'));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.error);
    }
  };

  const checkConfirmation = async () => {
    setError(null);
    const credentials = pendingCredentials(email);
    if (!credentials) {
      // Application relancée ou délai dépassé : la connexion vérifiera la confirmation.
      toast.info(t('auth.checkEmail.signInToFinish'));
      router.replace({ pathname: '/sign-in', params: { email } });
      return;
    }
    setChecking(true);
    const result = confirmationOutcome(await signIn(credentials));
    setChecking(false);
    setCheckCooldown(CONFIRMATION_CHECK_COOLDOWN_SECONDS);
    setOutcome(result);
    if (result === 'confirmed') {
      clearPendingConfirmation();
      markJustConfirmed();
      router.replace('/email-confirmed');
    } else if (result === 'needSignIn') {
      router.replace({ pathname: '/sign-in', params: { email } });
    }
  };

  const outcomeAlert =
    outcome === 'notConfirmed' ? (
      <FormAlert tone="info" message={t('auth.checkEmail.notConfirmedYet')} />
    ) : outcome === 'tooManyRequests' || outcome === 'network' || outcome === 'error' ? (
      <FormAlert
        message={t(outcome === 'error' ? 'auth.errors.unknown' : `auth.errors.${outcome}`)}
      />
    ) : null;

  return (
    <AuthLayout
      title={t(mode === 'reset' ? 'auth.checkEmail.titleReset' : 'auth.checkEmail.titleSignUp')}
      onBack={() => router.replace('/sign-in')}
    >
      <View
        style={styles.illustration}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name="mail-unread-outline" size={44} color="primary" />
      </View>
      <Text variant="body">{t('auth.checkEmail.body', { email })}</Text>

      {mode === 'signup' ? (
        <View style={styles.steps} accessibilityRole="list">
          {(['open', 'tap', 'return'] as const).map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text variant="label" color="onPrimary">
                  {index + 1}
                </Text>
              </View>
              <Text variant="bodySmall" style={styles.flex}>
                {t(`auth.checkEmail.steps.${step}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text variant="bodySmall" color="textSecondary">
        {t('auth.checkEmail.hint')}
      </Text>
      {error ? <FormAlert message={t(`auth.errors.${error}`)} /> : null}
      {outcomeAlert}

      {mode === 'signup' ? (
        <Button
          label={
            checkCooldown > 0 && !checking
              ? t('auth.checkEmail.checkAgainIn', { seconds: checkCooldown })
              : t('auth.checkEmail.confirmed')
          }
          icon="checkmark-circle-outline"
          size="lg"
          fullWidth
          disabled={checkCooldown > 0 || !email}
          loading={checking}
          onPress={() => void checkConfirmation()}
        />
      ) : null}
      <Button
        label={
          resendCooldown > 0
            ? t('auth.checkEmail.resendIn', { seconds: resendCooldown })
            : t('auth.checkEmail.resend')
        }
        variant="secondary"
        icon="refresh"
        fullWidth
        disabled={resendCooldown > 0 || !email}
        loading={sending}
        onPress={() => void resend()}
      />
      <Button
        label={t('auth.checkEmail.backToSignIn')}
        variant="ghost"
        fullWidth
        onPress={() => router.replace('/sign-in')}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  illustration: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  steps: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
