import { zodResolver } from '@hookform/resolvers/zod';
import { router, usePreventRemove } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  formatDzMobileForDisplay,
  profileUpdateSchema,
  type ProfileUpdateInput,
  type ProfileUpdateValues,
} from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { FormTextInput } from '@/components/form/FormTextInput';
import { LocationPicker } from '@/components/form/LocationPicker';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { MyProfile } from '@/features/profile/profileApi';
import { profileErrorKey, type ProfileErrorKey } from '@/features/profile/profileErrors';
import {
  useCommunes,
  useMyProfile,
  useUpdateProfile,
  useWilayas,
} from '@/features/profile/useProfile';
import { useDirection } from '@/hooks/useDirection';
import { sortByLabel } from '@/lib/searchRank';
import { toast } from '@/store/toastStore';
import { colors, radius, spacing } from '@/theme';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const profile = useMyProfile();

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={<ScreenHeader title={t('profile.editScreen.title')} onBack={() => router.back()} />}
    >
      {profile.isPending ? (
        <LoadingSkeleton count={3} />
      ) : profile.isError ? (
        <ErrorState title={t('profile.loadError')} onRetry={() => void profile.refetch()} />
      ) : (
        <EditProfileForm profile={profile.data} />
      )}
    </Screen>
  );
}

function EditProfileForm({ profile }: { profile: MyProfile }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const update = useUpdateProfile();
  const [serverError, setServerError] = useState<ProfileErrorKey | null>(null);
  const [wilayaId, setWilayaId] = useState<number | null>(profile.wilaya?.id ?? null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [leaving, setLeaving] = useState(false);

  const wilayas = useWilayas();
  const communes = useCommunes(wilayaId);

  const { control, handleSubmit, formState } = useForm<
    ProfileUpdateInput,
    unknown,
    ProfileUpdateValues
  >({
    resolver: zodResolver(profileUpdateSchema),
    mode: 'onTouched',
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: formatDzMobileForDisplay(profile.phone) ?? '',
      communeId: profile.commune?.id ?? null,
    },
  });

  // Confirmation avant de quitter avec des modifications non enregistrées (retour, geste, bouton).
  // `leaving` lève la protection avant de reprendre la navigation (au rendu suivant).
  usePreventRemove(formState.isDirty && !leaving, ({ repeat }) => setPendingLeave(() => repeat));
  const leaveThen = (navigate: () => void) => {
    setLeaving(true);
    requestAnimationFrame(navigate);
  };

  // Libellé dans la langue de l'interface ; l'autre langue reste cherchable.
  const wilayaOptions = useMemo(
    () =>
      (wilayas.data ?? []).map((w) => ({
        id: String(w.id),
        code: w.code,
        label: locale === 'ar' ? w.nameAr : w.nameFr,
        altLabel: locale === 'ar' ? w.nameFr : w.nameAr,
      })),
    [wilayas.data, locale],
  );
  const communeOptions = useMemo(
    () =>
      sortByLabel(
        (communes.data ?? []).map((c) => ({
          id: String(c.id),
          wilayaId: String(c.wilayaId),
          label: locale === 'ar' ? c.nameAr : c.nameFr,
          altLabel: locale === 'ar' ? c.nameFr : c.nameAr,
        })),
        locale,
      ),
    [communes.data, locale],
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await update.mutateAsync(values);
      toast.success(t('profile.editScreen.saved'));
      leaveThen(() => router.back());
    } catch (error) {
      setServerError(profileErrorKey(error));
    }
  });

  return (
    <View style={styles.form}>
      <View style={styles.identity}>
        <Avatar
          name={`${profile.firstName} ${profile.lastName}`.trim() || profile.email}
          uri={profile.avatarUrl}
          size={64}
        />
        <Text variant="body" color="textSecondary" style={styles.flex}>
          {t('profile.editScreen.subtitle')}
        </Text>
      </View>
      {serverError ? <FormAlert message={t(`profile.errors.${serverError}`)} /> : null}

      <FormTextInput
        control={control}
        name="firstName"
        label={t('auth.fields.firstName')}
        autoComplete="given-name"
        textContentType="givenName"
        autoCapitalize="words"
      />
      <FormTextInput
        control={control}
        name="lastName"
        label={t('auth.fields.lastName')}
        autoComplete="family-name"
        textContentType="familyName"
        autoCapitalize="words"
      />
      <FormTextInput
        control={control}
        name="phone"
        label={t('auth.fields.phone')}
        placeholder={t('auth.fields.phonePlaceholder')}
        helper={t('profile.editScreen.phoneChangeNote')}
        icon="call-outline"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
      />

      <View style={styles.locationCard}>
        <Text variant="h3">{t('profile.editScreen.locationTitle')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('profile.editScreen.locationHelper')}
        </Text>
        {wilayas.isError ? (
          <FormAlert
            message={t(`profile.errors.${profileErrorKey(wilayas.error, 'network')}`)}
            action={{ label: t('common.retry'), onPress: () => void wilayas.refetch() }}
          />
        ) : (
          <Controller
            control={control}
            name="communeId"
            render={({ field }) => (
              <LocationPicker
                wilayas={wilayaOptions}
                communes={communeOptions}
                disabled={wilayas.isPending}
                value={{
                  wilayaId: wilayaId === null ? null : String(wilayaId),
                  communeId:
                    field.value === null || field.value === undefined ? null : String(field.value),
                }}
                onChange={(next) => {
                  setWilayaId(next.wilayaId === null ? null : Number(next.wilayaId));
                  field.onChange(next.communeId === null ? null : Number(next.communeId));
                }}
              />
            )}
          />
        )}
      </View>

      <Button
        label={t('profile.editScreen.save')}
        size="lg"
        fullWidth
        disabled={!formState.isDirty}
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />

      <Modal
        visible={pendingLeave !== null}
        onClose={() => setPendingLeave(null)}
        title={t('profile.editScreen.unsavedTitle')}
        description={t('profile.editScreen.unsavedBody')}
        secondaryAction={{ label: t('common.cancel'), onPress: () => setPendingLeave(null) }}
        primaryAction={{
          label: t('profile.editScreen.discard'),
          destructive: true,
          onPress: () => {
            const leave = pendingLeave;
            setPendingLeave(null);
            if (leave) leaveThen(leave);
          },
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  flex: { flex: 1 },
  locationCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
