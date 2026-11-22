import { usePreventRemove } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ARTISAN_RULES, artisanTradesSchema } from '@khedma/validation';

import { FormAlert } from '@/components/auth/FormAlert';
import { CategorySelector } from '@/components/form/CategorySelector';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { ProProfile } from '@/features/artisan/proProfileApi';
import { proErrorKey, type ProErrorKey } from '@/features/artisan/proProfileLogic';
import { useProProfile, useSaveTrades } from '@/features/artisan/useProProfile';
import { useCategories, type Category } from '@/features/categories/categoriesApi';
import { categoryIcon } from '@/features/categories/categoryIcons';
import { useDirection } from '@/hooks/useDirection';
import { toast } from '@/store/toastStore';
import { spacing } from '@/theme';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

/** Métier principal et métiers secondaires (5 au maximum). */
export default function ProTradesScreen() {
  const { t } = useTranslation();
  const pro = useProProfile();
  const categories = useCategories();
  const loading = pro.isPending || categories.isPending;
  const failed = pro.isError || categories.isError || (!loading && !pro.data);

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={
        <ScreenHeader title={t('pro.trades.title')} onBack={() => safeBack(BACK_FALLBACK.pro)} />
      }
    >
      {loading ? (
        <LoadingSkeleton count={3} />
      ) : failed || !pro.data || !categories.data ? (
        <ErrorState
          title={t('space.artisan.loadError')}
          onRetry={() => {
            void pro.refetch();
            void categories.refetch();
          }}
        />
      ) : (
        <TradesForm profile={pro.data} categories={categories.data} />
      )}
    </Screen>
  );
}

function TradesForm({ profile, categories }: { profile: ProProfile; categories: Category[] }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const save = useSaveTrades();
  const initialSecondary = profile.services
    .map((s) => s.categoryId)
    .filter((id) => id !== profile.primaryCategoryId);
  const [primary, setPrimary] = useState(profile.primaryCategoryId);
  const [secondary, setSecondary] = useState<string[]>(initialSecondary);
  const [serverError, setServerError] = useState<ProErrorKey | null>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const [leaving, setLeaving] = useState(false);

  const dirty =
    primary !== profile.primaryCategoryId ||
    secondary.length !== initialSecondary.length ||
    secondary.some((id) => !initialSecondary.includes(id));
  usePreventRemove(dirty && !leaving, ({ repeat }) => setPendingLeave(() => repeat));
  const leaveThen = (navigate: () => void) => {
    setLeaving(true);
    requestAnimationFrame(navigate);
  };

  const items = useMemo(
    () =>
      categories.map((c) => ({
        id: c.id,
        label: locale === 'ar' ? c.nameAr : c.nameFr,
        icon: categoryIcon(c.slug),
      })),
    [categories, locale],
  );
  const secondaryItems = items.filter((item) => item.id !== primary);
  const full = secondary.length >= ARTISAN_RULES.secondaryTradesMax;

  const onSave = async () => {
    setServerError(null);
    const parsed = artisanTradesSchema.safeParse({
      primaryCategoryId: primary,
      secondaryCategoryIds: secondary,
    });
    if (!parsed.success) {
      setServerError('servicesLimit');
      return;
    }
    try {
      await save.mutateAsync({ current: profile, values: parsed.data });
      toast.success(t('pro.saved'));
      leaveThen(() => safeBack(BACK_FALLBACK.pro));
    } catch (error) {
      setServerError(proErrorKey(error));
    }
  };

  return (
    <View style={styles.form}>
      <Text variant="body" color="textSecondary">
        {t('pro.trades.subtitle')}
      </Text>
      {serverError ? <FormAlert message={t(`pro.errors.${serverError}`)} /> : null}

      <CategorySelector
        label={t('space.setup.category')}
        items={items}
        value={[primary]}
        onChange={(ids) => {
          const next = ids[0];
          if (!next) return;
          setPrimary(next);
          // L'ancien principal reste proposé comme métier secondaire s'il y a de la place.
          setSecondary((current) => current.filter((id) => id !== next));
        }}
      />

      <View style={styles.block}>
        <Text variant="h3">{t('pro.trades.secondary')}</Text>
        <Text variant="caption" color={full ? 'warningDark' : 'textSecondary'}>
          {t('pro.trades.secondaryCount', {
            count: secondary.length,
            max: ARTISAN_RULES.secondaryTradesMax,
          })}
        </Text>
        <CategorySelector
          mode="multiple"
          layout="chips"
          items={secondaryItems}
          value={secondary}
          onChange={(ids) => {
            if (ids.length > ARTISAN_RULES.secondaryTradesMax) {
              toast.error(t('pro.errors.servicesLimit'));
              return;
            }
            setSecondary(ids);
          }}
        />
      </View>

      <Button
        label={t('common.save')}
        size="lg"
        fullWidth
        disabled={!dirty}
        loading={save.isPending}
        onPress={() => void onSave()}
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
  form: { gap: spacing.xl },
  block: { gap: spacing.sm },
});
