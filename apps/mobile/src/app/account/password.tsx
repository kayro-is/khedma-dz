import { zodResolver } from '@hookform/resolvers/zod';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { changePasswordSchema, type ChangePasswordInput } from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { FormTextInput } from '@/components/form/FormTextInput';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { authErrorKey, type AuthErrorKey } from '@/features/auth/authErrors';
import { useAuth } from '@/features/auth/AuthProvider';
import { changeMyPassword } from '@/features/profile/profileApi';
import { toast } from '@/store/toastStore';
import { spacing } from '@/theme';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [serverError, setServerError] = useState<AuthErrorKey | 'wrongCurrentPassword' | null>(
    null,
  );

  const { control, handleSubmit, formState } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await changeMyPassword(session?.user.email ?? '', values.currentPassword, values.newPassword);
      toast.success(t('profile.passwordScreen.success'));
      safeBack(BACK_FALLBACK.entry);
    } catch (error) {
      const key = authErrorKey(error);
      setServerError(key === 'invalidCredentials' ? 'wrongCurrentPassword' : key);
    }
  });

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={
        <ScreenHeader
          title={t('profile.passwordScreen.title')}
          onBack={() => safeBack(BACK_FALLBACK.entry)}
        />
      }
      contentStyle={styles.content}
    >
      <Text variant="body" color="textSecondary">
        {t('profile.passwordScreen.subtitle')}
      </Text>
      {serverError ? (
        <FormAlert
          message={t(
            serverError === 'wrongCurrentPassword'
              ? 'profile.errors.wrongCurrentPassword'
              : `auth.errors.${serverError}`,
          )}
        />
      ) : null}

      <FormTextInput
        control={control}
        name="currentPassword"
        label={t('profile.passwordScreen.current')}
        icon="lock-closed-outline"
        password
        autoComplete="current-password"
        textContentType="password"
      />
      <View style={styles.passwordBlock}>
        <FormTextInput
          control={control}
          name="newPassword"
          label={t('auth.fields.newPassword')}
          icon="key-outline"
          password
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <PasswordStrengthMeter password={newPassword} />
      </View>
      <FormTextInput
        control={control}
        name="confirmPassword"
        label={t('auth.fields.confirmPassword')}
        icon="key-outline"
        password
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
      />

      <Button
        label={t('profile.passwordScreen.submit')}
        size="lg"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  passwordBlock: { gap: spacing.sm },
});
