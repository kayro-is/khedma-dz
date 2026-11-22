import { zodResolver } from '@hookform/resolvers/zod';
import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  artisanActivationSchema,
  type ArtisanActivationInput,
  type ArtisanActivationValues,
} from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { CategorySelector } from '@/components/form/CategorySelector';
import { FormTextInput, translateValidation } from '@/components/form/FormTextInput';
import { LocationPicker } from '@/components/form/LocationPicker';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { useCategories } from '@/features/categories/categoriesApi';
import { categoryIcon } from '@/features/categories/categoryIcons';
import type { MyProfile } from '@/features/profile/profileApi';
import { useCommunes, useMyProfile, useWilayas } from '@/features/profile/useProfile';
import { spaceErrorKey, type SpaceErrorKey } from '@/features/space/spaceErrors';
import { useSpace } from '@/features/space/SpaceProvider';
import { useActivateArtisan } from '@/features/space/useArtisan';
import { useDirection } from '@/hooks/useDirection';
import { sortByLabel } from '@/lib/searchRank';
import { toast } from '@/store/toastStore';
import { colors, radius, spacing } from '@/theme';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

/** Activation de l'espace Artisan sur le compte existant : informations minimales (KHD-006). */
export default function ArtisanSetupScreen() {
  const { t } = useTranslation();
  const { isArtisan } = useSpace();
  const profile = useMyProfile();
  const [activated, setActivated] = useState(false);

  if (isArtisan && !activated) return <Redirect href="/" />;

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={
        <ScreenHeader title={t('space.setup.title')} onBack={() => safeBack(BACK_FALLBACK.entry)} />
      }
    >
      {profile.isPending ? (
        <View style={styles.form}>
          <Skeleton height={56} borderRadius={radius.md} />
          <Skeleton height={220} borderRadius={radius.lg} />
          <Skeleton height={140} borderRadius={radius.lg} />
        </View>
      ) : profile.isError ? (
        <ErrorState
          kind={spaceErrorKey(profile.error) === 'network' ? 'network' : 'generic'}
          title={t('profile.loadError')}
          onRetry={() => void profile.refetch()}
          retrying={profile.isFetching}
        />
      ) : (
        <ArtisanSetupForm profile={profile.data} onActivated={() => setActivated(true)} />
      )}
    </Screen>
  );
}

function ArtisanSetupForm({
  profile,
  onActivated,
}: {
  profile: MyProfile;
  onActivated: () => void;
}) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const { switchSpace } = useSpace();
  const activate = useActivateArtisan();
  const categories = useCategories();
  const wilayas = useWilayas();
  const [wilayaId, setWilayaId] = useState<number | null>(profile.wilaya?.id ?? null);
  const communes = useCommunes(wilayaId);
  const [serverError, setServerError] = useState<SpaceErrorKey | null>(null);

  const { control, handleSubmit, formState } = useForm<
    ArtisanActivationInput,
    unknown,
    ArtisanActivationValues
  >({
    resolver: zodResolver(artisanActivationSchema),
    mode: 'onTouched',
    defaultValues: {
      businessName: '',
      categoryId: '',
      // Commune du profil proposée par défaut ; modifiable (zone d'activité ≠ domicile).
      communeId: profile.commune?.id,
      yearsExperience: '',
    },
  });

  const categoryItems = useMemo(
    () =>
      (categories.data ?? []).map((c) => ({
        id: c.id,
        label: locale === 'ar' ? c.nameAr : c.nameFr,
        icon: categoryIcon(c.slug),
      })),
    [categories.data, locale],
  );
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
      await activate.mutateAsync(values);
      onActivated();
      toast.success(t('space.setup.success'));
      await switchSpace('artisan');
    } catch (error) {
      setServerError(spaceErrorKey(error));
    }
  });

  return (
    <View style={styles.form}>
      <Text variant="body" color="textSecondary">
        {t('space.setup.subtitle')}
      </Text>
      {serverError ? <FormAlert message={t(`space.errors.${serverError}`)} /> : null}

      <FormTextInput
        control={control}
        name="businessName"
        label={t('space.setup.businessName')}
        placeholder={t('space.setup.businessNamePlaceholder')}
        helper={t('space.setup.businessNameHelper')}
        icon="storefront-outline"
        autoCapitalize="words"
        maxLength={80}
      />

      {categories.isPending ? (
        <Skeleton height={220} borderRadius={radius.lg} />
      ) : categories.isError ? (
        <FormAlert
          message={t(`space.errors.${spaceErrorKey(categories.error)}`)}
          action={{ label: t('common.retry'), onPress: () => void categories.refetch() }}
        />
      ) : (
        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <CategorySelector
              label={t('space.setup.category')}
              items={categoryItems}
              value={field.value ? [field.value] : []}
              onChange={(ids) => field.onChange(ids[0] ?? '')}
              error={
                fieldState.error
                  ? translateValidation(t, fieldState.error.message ?? 'validation.required')
                  : undefined
              }
            />
          )}
        />
      )}

      <View style={styles.locationCard}>
        <Text variant="h3">{t('space.setup.baseCommune')}</Text>
        <Text variant="caption" color="textSecondary">
          {t('space.setup.baseCommuneHelper')}
        </Text>
        {wilayas.isError ? (
          <FormAlert
            message={t(`space.errors.${spaceErrorKey(wilayas.error)}`)}
            action={{ label: t('common.retry'), onPress: () => void wilayas.refetch() }}
          />
        ) : (
          <Controller
            control={control}
            name="communeId"
            render={({ field, fieldState }) => (
              <LocationPicker
                wilayas={wilayaOptions}
                communes={communeOptions}
                disabled={wilayas.isPending}
                value={{
                  wilayaId: wilayaId === null ? null : String(wilayaId),
                  communeId:
                    field.value === null || field.value === undefined ? null : String(field.value),
                }}
                errors={
                  fieldState.error
                    ? {
                        commune: translateValidation(
                          t,
                          fieldState.error.message ?? 'validation.required',
                        ),
                      }
                    : undefined
                }
                onChange={(next) => {
                  setWilayaId(next.wilayaId === null ? null : Number(next.wilayaId));
                  field.onChange(next.communeId === null ? undefined : Number(next.communeId));
                }}
              />
            )}
          />
        )}
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

      <FormAlert tone="info" message={t('space.setup.privacyNote')} />

      <Button
        label={t('space.setup.submit')}
        size="lg"
        fullWidth
        loading={formState.isSubmitting}
        onPress={() => void onSubmit()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  locationCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
