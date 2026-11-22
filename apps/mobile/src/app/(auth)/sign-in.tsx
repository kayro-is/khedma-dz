import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { signInSchema, type SignInInput, type SignInValues } from '@khedma/validation';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert } from '@/components/auth/FormAlert';
import { FormTextInput } from '@/components/form/FormTextInput';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import type { AuthErrorKey } from '@/features/auth/authErrors';
import { resendConfirmation, signIn } from '@/features/auth/authService';
import { toast } from '@/store/toastStore';
import { spacing } from '@/theme';
import { BACK_FALLBACK, useSafeBack } from '@/lib/navigation';

export default function SignInScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack(BACK_FALLBACK.entry);
  // Adresse pré-remplie depuis « Vérifiez votre boîte e-mail » (jamais le mot de passe).
  const params = useLocalSearchParams<{ email?: string }>();
  const initialEmail = typeof params.email === 'string' ? params.email : '';
  const { signOutReason, acknowledgeSignOutReason } = useAuth();
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);
  const [resending, setResending] = useState(false);
  // Message « session expirée » mémorisé à l'ouverture de l'écran, puis acquitté.
  const [expiredNotice] = useState(signOutReason === 'expired');

  useEffect(() => {
    if (signOutReason) acknowledgeSignOutReason();
  }, [signOutReason, acknowledgeSignOutReason]);

  const { control, handleSubmit, formState, getValues } = useForm<
    SignInInput,
    unknown,
    SignInValues
  >({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: { email: initialEmail, password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await signIn(values);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    // La garde de navigation bascule vers l'espace connecté (app/_layout.tsx).
    router.replace('/');
  });

  const onResend = async () => {
    setResending(true);
    const result = await resendConfirmation(getValues('email').trim().toLowerCase());
    setResending(false);
    if (result.ok) toast.success(t('auth.checkEmail.resent'));
    else setServerError(result.error);
  };

  return (
    <AuthLayout
      title={t('auth.signIn.title')}
      subtitle={t('auth.signIn.subtitle')}
      onBack={goBack}
      footer={
        <View style={styles.inline}>
          <Text variant="body" color="textSecondary">
            {t('auth.signIn.noAccount')}
          </Text>
          <Button
            label={t('auth.signIn.signUpLink')}
            variant="ghost"
            size="sm"
            onPress={() => router.replace('/sign-up')}
          />
        </View>
      }
    >
      {expiredNotice && !serverError ? (
        <FormAlert tone="info" message={t('auth.signIn.sessionExpired')} />
      ) : null}
      {serverError ? (
        <FormAlert
          message={t(`auth.errors.${serverError}`)}
          action={
            serverError === 'emailNotConfirmed'
              ? {
                  label: t('auth.signIn.resendConfirmation'),
                  onPress: () => void onResend(),
                  loading: resending,
                }
              : undefined
          }
        />
      ) : null}

      <FormTextInput
        control={control}
        name="email"
        label={t('auth.fields.email')}
        placeholder={t('auth.fields.emailPlaceholder')}
        icon="mail-outline"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
      />
      <FormTextInput
        control={control}
        name="password"
        label={t('auth.fields.password')}
        icon="lock-closed-outline"
        password
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
      />

      <Button
        label={t('auth.signIn.forgot')}
        variant="ghost"
        size="sm"
        style={styles.forgot}
        onPress={() => router.push('/forgot-password')}
      />

      <Button
        label={t('auth.signIn.submit')}
        size="lg"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  forgot: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
