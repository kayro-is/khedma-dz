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
import { requestPasswordReset, resendConfirmation } from '@/features/auth/authService';
import { toast } from '@/store/toastStore';
import { colors, radius } from '@/theme';

// Aligné sur la fréquence maximale d'envoi d'e-mails configurée dans Supabase (1 minute).
const RESEND_COOLDOWN_SECONDS = 60;

export default function CheckEmailScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ mode?: string; email?: string }>();
  const mode = params.mode === 'reset' ? 'reset' : 'signup';
  const email = typeof params.email === 'string' ? params.email : '';

  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    setError(null);
    const result =
      mode === 'reset' ? await requestPasswordReset(email) : await resendConfirmation(email);
    setSending(false);
    if (result.ok) {
      toast.success(t('auth.checkEmail.resent'));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setError(result.error);
    }
  };

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
      <Text variant="bodySmall" color="textSecondary">
        {t('auth.checkEmail.hint')}
      </Text>
      {error ? <FormAlert message={t(`auth.errors.${error}`)} /> : null}
      <Button
        label={
          cooldown > 0
            ? t('auth.checkEmail.resendIn', { seconds: cooldown })
            : t('auth.checkEmail.resend')
        }
        variant="secondary"
        icon="refresh"
        fullWidth
        disabled={cooldown > 0 || !email}
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
});
