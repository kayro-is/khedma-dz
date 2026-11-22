import { zodResolver } from '@hookform/resolvers/zod';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { deleteAccountSchema, type DeleteAccountInput } from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { FormTextInput } from '@/components/form/FormTextInput';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { deleteMyAccount } from '@/features/profile/profileApi';
import { clearSpacePreference } from '@/features/space/SpaceProvider';
import { profileErrorKey, type ProfileErrorKey } from '@/features/profile/profileErrors';
import { toast } from '@/store/toastStore';
import { colors, radius, spacing, type ColorToken } from '@/theme';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

function Bullet({ icon, color, text }: { icon: IconName; color: ColorToken; text: string }) {
  return (
    <View style={styles.bullet}>
      <Icon name={icon} size={18} color={color} />
      <Text variant="bodySmall" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

/** Suppression définitive du compte, avec explication de ce qui est supprimé ou anonymisé. */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const { session, expectSignOut } = useAuth();
  const email = session?.user.email ?? '';
  const userId = session?.user.id ?? '';
  const [serverError, setServerError] = useState<ProfileErrorKey | null>(null);

  const schema = useMemo(() => deleteAccountSchema(email), [email]);
  const { control, handleSubmit, formState } = useForm<DeleteAccountInput>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: { confirmation: '' },
  });

  const onSubmit = handleSubmit(async () => {
    setServerError(null);
    try {
      await deleteMyAccount(userId, () => {
        expectSignOut();
        void clearSpacePreference(userId);
      });
      toast.success(t('profile.deleteScreen.done'));
    } catch (error) {
      setServerError(profileErrorKey(error));
    }
  });

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={
        <ScreenHeader
          title={t('profile.deleteScreen.title')}
          onBack={() => safeBack(BACK_FALLBACK.entry)}
        />
      }
      contentStyle={styles.content}
    >
      <FormAlert message={t('profile.deleteScreen.intro')} />

      <View style={styles.card}>
        <Text variant="h3">{t('profile.deleteScreen.deletedTitle')}</Text>
        <Bullet icon="close-circle" color="error" text={t('profile.deleteScreen.deleted1')} />
        <Bullet icon="close-circle" color="error" text={t('profile.deleteScreen.deleted2')} />
        <Bullet icon="close-circle" color="error" text={t('profile.deleteScreen.deleted3')} />
      </View>

      <View style={styles.card}>
        <Text variant="h3">{t('profile.deleteScreen.keptTitle')}</Text>
        <Bullet
          icon="eye-off-outline"
          color="textSecondary"
          text={t('profile.deleteScreen.kept1')}
        />
        <Bullet
          icon="eye-off-outline"
          color="textSecondary"
          text={t('profile.deleteScreen.kept2')}
        />
      </View>

      <Text variant="bodySmall" color="textSecondary">
        {t('profile.deleteScreen.activeJobsNote')}
      </Text>

      {serverError ? <FormAlert message={t(`profile.errors.${serverError}`)} /> : null}

      <FormTextInput
        control={control}
        name="confirmation"
        label={t('profile.deleteScreen.confirmLabel')}
        placeholder={email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
      />

      <Button
        label={t('profile.deleteScreen.submit')}
        variant="danger"
        size="lg"
        fullWidth
        icon="trash-outline"
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
      <Button
        label={t('common.cancel')}
        variant="ghost"
        fullWidth
        onPress={() => safeBack(BACK_FALLBACK.entry)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  flex: { flex: 1 },
});
