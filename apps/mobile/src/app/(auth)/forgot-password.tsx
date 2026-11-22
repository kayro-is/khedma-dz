import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { forgotPasswordSchema, type ForgotPasswordInput } from '@khedma/validation';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert } from '@/components/auth/FormAlert';
import { FormTextInput } from '@/components/form/FormTextInput';
import { Button } from '@/components/ui/Button';
import type { AuthErrorKey } from '@/features/auth/authErrors';
import { requestPasswordReset } from '@/features/auth/authService';
import { BACK_FALLBACK, useSafeBack } from '@/lib/navigation';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack(BACK_FALLBACK.auth);
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);

  const { control, handleSubmit, formState } = useForm<
    ForgotPasswordInput,
    unknown,
    { email: string }
  >({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setServerError(null);
    const result = await requestPasswordReset(email);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    // Même écran que le compte existe ou non (aucune énumération d'adresses).
    router.replace({ pathname: '/check-email', params: { mode: 'reset', email } });
  });

  return (
    <AuthLayout title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')} onBack={goBack}>
      {serverError ? <FormAlert message={t(`auth.errors.${serverError}`)} /> : null}
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
        returnKeyType="send"
        onSubmitEditing={() => void onSubmit()}
      />
      <Button
        label={t('auth.forgot.submit')}
        size="lg"
        fullWidth
        icon="paper-plane-outline"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthLayout>
  );
}
