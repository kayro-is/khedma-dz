import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  signUpSchema,
  VALIDATION_MESSAGES,
  type SignUpInput,
  type SignUpValues,
} from '@khedma/validation';

import { AuthLayout } from '@/components/auth/AuthLayout';
import { FormAlert } from '@/components/auth/FormAlert';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Checkbox } from '@/components/form/Checkbox';
import { FormTextInput, translateValidation } from '@/components/form/FormTextInput';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { AuthErrorKey } from '@/features/auth/authErrors';
import { signUp } from '@/features/auth/authService';
import { rememberPendingConfirmation } from '@/features/auth/pendingConfirmation';
import { useDirection } from '@/hooks/useDirection';
import { spacing } from '@/theme';
import { BACK_FALLBACK, useSafeBack } from '@/lib/navigation';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const goBack = useSafeBack(BACK_FALLBACK.auth);
  const { locale } = useDirection();
  const [serverError, setServerError] = useState<AuthErrorKey | null>(null);

  const { control, handleSubmit, formState, setError } = useForm<
    SignUpInput,
    unknown,
    SignUpValues
  >({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await signUp(values, locale);
    if (!result.ok) {
      setServerError(result.error);
      // Création refusée par le serveur : cause la plus fréquente, un numéro déjà utilisé.
      if (result.error === 'signupRejected') {
        setError('phone', { type: 'server', message: VALIDATION_MESSAGES.phoneMaybeTaken });
      }
      return;
    }
    // Identifiants gardés en mémoire seulement (jamais dans l'URL) pour « J'ai confirmé mon e-mail ».
    rememberPendingConfirmation(values.email, values.password);
    router.replace({ pathname: '/check-email', params: { mode: 'signup', email: values.email } });
  });

  return (
    <AuthLayout
      title={t('auth.signUp.title')}
      subtitle={t('auth.signUp.subtitle')}
      onBack={goBack}
      footer={
        <View style={styles.inline}>
          <Text variant="body" color="textSecondary">
            {t('auth.signUp.haveAccount')}
          </Text>
          <Button
            label={t('auth.signUp.signInLink')}
            variant="ghost"
            size="sm"
            onPress={() => router.replace('/sign-in')}
          />
        </View>
      }
    >
      {serverError ? <FormAlert message={t(`auth.errors.${serverError}`)} /> : null}

      <View style={styles.row}>
        <View style={styles.flex}>
          <FormTextInput
            control={control}
            name="firstName"
            label={t('auth.fields.firstName')}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>
        <View style={styles.flex}>
          <FormTextInput
            control={control}
            name="lastName"
            label={t('auth.fields.lastName')}
            autoComplete="family-name"
            textContentType="familyName"
            autoCapitalize="words"
            returnKeyType="next"
          />
        </View>
      </View>

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
        name="phone"
        label={t('auth.fields.phone')}
        placeholder={t('auth.fields.phonePlaceholder')}
        helper={t('auth.fields.phoneHelper')}
        icon="call-outline"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
      />

      <View style={styles.passwordBlock}>
        <FormTextInput
          control={control}
          name="password"
          label={t('auth.fields.password')}
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

      <Controller
        control={control}
        name="acceptTerms"
        render={({ field, fieldState }) => (
          <View>
            <Checkbox
              checked={field.value === true}
              onChange={field.onChange}
              label={t('auth.signUp.acceptTerms')}
              error={
                fieldState.error?.message
                  ? translateValidation(t, fieldState.error.message)
                  : undefined
              }
            />
            <Button
              label={t('auth.signUp.readTerms')}
              variant="ghost"
              size="sm"
              iconEnd="open-outline"
              onPress={() => router.push('/terms')}
            />
          </View>
        )}
      />

      <Button
        label={t('auth.signUp.submit')}
        size="lg"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  passwordBlock: { gap: spacing.sm },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
});
