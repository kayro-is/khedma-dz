import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { resetPasswordSchema, type ResetPasswordInput } from '@khedma/validation';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert } from '@/components/auth/FormAlert';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { FormTextInput } from '@/components/form/FormTextInput';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthProvider';
import type { AuthErrorKey } from '@/features/auth/authErrors';
import { updatePassword } from '@/features/auth/authService';
import { toast } from '@/store/toastStore';
import { spacing } from '@/theme';

/** Choix d'un nouveau mot de passe après le lien « mot de passe oublié » (session de récupération). */
export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { completePasswordRecovery } = useAuth();
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);

  const { control, handleSubmit, formState } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await updatePassword(values.password);
    if (!result.ok) {
      setServerError(result.error);
      return;
    }
    completePasswordRecovery();
    toast.success(t('auth.reset.success'));
    router.replace('/');
  });

  return (
    <AuthLayout title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')}>
      {serverError ? <FormAlert message={t(`auth.errors.${serverError}`)} /> : null}
      <View style={styles.passwordBlock}>
        <FormTextInput
          control={control}
          name="password"
          label={t('auth.fields.newPassword')}
          icon="lock-closed-outline"
          password
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />
        <PasswordStrengthMeter password={password} />
      </View>
      <FormTextInput
        control={control}
        name="confirmPassword"
        label={t('auth.fields.confirmPassword')}
        icon="lock-closed-outline"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
      />
      <Button
        label={t('auth.reset.submit')}
        size="lg"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  passwordBlock: { gap: spacing.sm },
});
