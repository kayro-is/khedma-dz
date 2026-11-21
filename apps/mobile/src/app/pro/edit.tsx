import { zodResolver } from '@hookform/resolvers/zod';
import { router, usePreventRemove } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  ARTISAN_AVAILABILITY,
  ARTISAN_RULES,
  artisanProfileSchema,
  formatDzMobileForDisplay,
  type ArtisanProfileInput,
  type ArtisanProfileValues,
} from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { FormTextInput } from '@/components/form/FormTextInput';
import { LocationPicker } from '@/components/form/LocationPicker';
import { RadioGroup } from '@/components/form/RadioGroup';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { ProProfile } from '@/features/artisan/proProfileApi';
import { proErrorKey, type ProErrorKey } from '@/features/artisan/proProfileLogic';
import { useProProfile, useUpdateProInfo } from '@/features/artisan/useProProfile';
import { useCommunes, useWilayas } from '@/features/profile/useProfile';
import { useDirection } from '@/hooks/useDirection';
import { sortByLabel } from '@/lib/searchRank';
import { toast } from '@/store/toastStore';
import { colors, radius, spacing } from '@/theme';

/** Informations professionnelles : nom, description, expérience, disponibilité, commune, téléphone. */
export default function ProEditScreen() {
  const { t } = useTranslation();
  const pro = useProProfile();

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={<ScreenHeader title={t('pro.edit.title')} onBack={() => router.back()} />}
    >
      {pro.isPending ? (
        <LoadingSkeleton count={4} />
      ) : pro.isError || !pro.data ? (
        <ErrorState title={t('space.artisan.loadError')} onRetry={() => void pro.refetch()} />
      ) : (
        <ProEditForm profile={pro.data} />
      )}
    </Screen>
  );
}

function ProEditForm({ profile }: { profile: ProProfile }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const update = useUpdateProInfo();
  const wilayas = useWilayas();
  const [wilayaId, setWilayaId] = useState<number | null>(profile.baseCommune?.wilaya?.id ?? null);
  const communes = useCommunes(wilayaId);
  const [serverError, setServerError] = useState<ProErrorKey | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [leaving, setLeaving] = useState(false);

  const { control, handleSubmit, formState } = useForm<
    ArtisanProfileInput,
    unknown,
    ArtisanProfileValues
  >({
    resolver: zodResolver(artisanProfileSchema),
    mode: 'onTouched',
    defaultValues: {
      businessName: profile.businessName,
      description: profile.description ?? '',
      yearsExperience: profile.yearsExperience === null ? '' : String(profile.yearsExperience),
      availability: profile.availability,
      communeId: profile.baseCommune?.id,
      professionalPhone: formatDzMobileForDisplay(profile.professionalPhone) ?? '',
    },
  });
  const description = useWatch({ control, name: 'description' }) ?? '';
  const descriptionLength = description.trim().length;

  // Confirmation avant de quitter avec des modifications non enregistrées.
  usePreventRemove(formState.isDirty && !leaving, ({ repeat }) => setPendingLeave(() => repeat));
  const leaveThen = (navigate: () => void) => {
    setLeaving(true);
    requestAnimationFrame(navigate);
  };

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
      toast.success(t('pro.saved'));
      leaveThen(() => router.back());
    } catch (error) {
      setServerError(proErrorKey(error));
    }
  });

  return (
    <View style={styles.form}>
      {serverError ? <FormAlert message={t(`pro.errors.${serverError}`)} /> : null}

      <FormTextInput
        control={control}
        name="businessName"
        label={t('space.setup.businessName')}
        icon="storefront-outline"
        autoCapitalize="words"
        maxLength={80}
      />

      <View style={styles.block}>
        <FormTextInput
          control={control}
          name="description"
          label={t('pro.edit.description')}
          placeholder={t('pro.edit.descriptionPlaceholder')}
          multiline
          maxLength={ARTISAN_RULES.descriptionMax}
        />
        <Text
          variant="caption"
          color={
            descriptionLength >= ARTISAN_RULES.publishDescriptionMin ? 'success' : 'textSecondary'
          }
        >
          {descriptionLength >= ARTISAN_RULES.publishDescriptionMin
            ? t('pro.edit.descriptionReady', { count: descriptionLength })
            : t('pro.edit.descriptionMin', {
                count: descriptionLength,
                min: ARTISAN_RULES.publishDescriptionMin,
              })}
        </Text>
      </View>

      <FormTextInput
        control={control}
        name="yearsExperience"
        label={t('space.setup.yearsExperience')}
        placeholder="0"
        optional
        icon="time-outline"
        keyboardType="number-pad"
        maxLength={2}
      />

      <Controller
        control={control}
        name="availability"
        render={({ field }) => (
          <RadioGroup
            label={t('pro.edit.availability')}
            value={field.value ?? null}
            onChange={field.onChange}
            options={ARTISAN_AVAILABILITY.map((value) => ({
              value,
              label: t(`pro.availability.${value}`),
              description: t(`pro.availabilityHint.${value}`),
            }))}
          />
        )}
      />

      <View style={styles.card}>
        <Text variant="h3">{t('space.setup.baseCommune')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('pro.edit.baseCommuneHelper')}
        </Text>
        {wilayas.isError ? (
          <FormAlert
            message={t('pro.errors.network')}
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
                  communeId: field.value === undefined ? null : String(field.value),
                }}
                onChange={(next) => {
                  setWilayaId(next.wilayaId === null ? null : Number(next.wilayaId));
                  field.onChange(next.communeId === null ? undefined : Number(next.communeId));
                }}
              />
            )}
          />
        )}
      </View>

      <View style={styles.card}>
        <FormTextInput
          control={control}
          name="professionalPhone"
          label={t('pro.edit.phone')}
          placeholder={t('auth.fields.phonePlaceholder')}
          optional
          icon="call-outline"
          keyboardType="phone-pad"
          autoComplete="tel"
        />
        <FormAlert tone="info" message={t('pro.edit.phonePrivacy')} />
      </View>

      <Button
        label={t('common.save')}
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
  block: { gap: spacing.xs },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
