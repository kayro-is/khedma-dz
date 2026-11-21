import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SpaceSwitchButton } from '@/components/navigation/SpaceSwitcher';
import { UpcomingList, type UpcomingItem } from '@/components/navigation/UpcomingList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { categoryIcon } from '@/features/categories/categoryIcons';
import type { MyArtisanProfile } from '@/features/space/spaceApi';
import { spaceErrorKey } from '@/features/space/spaceErrors';
import { useMyArtisanProfile } from '@/features/space/useArtisan';
import { useDirection } from '@/hooks/useDirection';
import { colors, radius, shadows, spacing } from '@/theme';

/** Tableau de bord de l'espace Artisan : état réel du profil et prochaines étapes. */
export default function ArtisanDashboard() {
  const { t } = useTranslation();
  const artisan = useMyArtisanProfile();

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title={t('nav.dashboard')}
          subtitle={t('space.names.artisan')}
          actions={<SpaceSwitchButton />}
        />
      }
      contentStyle={styles.content}
    >
      {artisan.isPending ? (
        <Skeleton height={168} borderRadius={radius.xl} />
      ) : artisan.isError ? (
        <ErrorState
          kind={spaceErrorKey(artisan.error) === 'network' ? 'network' : 'generic'}
          title={t('space.artisan.loadError')}
          onRetry={() => void artisan.refetch()}
          retrying={artisan.isFetching}
        />
      ) : artisan.data ? (
        <ArtisanSummary profile={artisan.data} />
      ) : null}

      <Button
        label={t('pro.hub.manage')}
        icon="create-outline"
        variant="secondary"
        fullWidth
        onPress={() => router.push('/artisan/profil')}
      />

      <UpcomingList
        title={t('space.artisan.nextSteps')}
        items={(['verification', 'requests'] as const).map((key): UpcomingItem => ({
          key,
          icon: STEP_ICONS[key],
          title: t(`space.artisan.steps.${key}.title`),
          description: t(`space.artisan.steps.${key}.body`),
        }))}
      />
    </Screen>
  );
}

const STEP_ICONS = {
  verification: 'shield-checkmark-outline',
  requests: 'megaphone-outline',
} as const;

function ArtisanSummary({ profile }: { profile: MyArtisanProfile }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const name = (value: { nameFr: string; nameAr: string } | null | undefined) =>
    value ? (locale === 'ar' ? value.nameAr : value.nameFr) : t('profile.notProvided');
  const place = profile.commune
    ? [name(profile.commune), profile.commune.wilaya ? name(profile.commune.wilaya) : null]
        .filter(Boolean)
        .join(' · ')
    : t('profile.notProvided');

  return (
    <View style={styles.summary}>
      <View style={styles.summaryHeader}>
        <View style={styles.tradeIcon}>
          <Icon name={categoryIcon(profile.category?.slug ?? '')} size={26} color="onPrimary" />
        </View>
        <View style={styles.flex}>
          <Text variant="h3" numberOfLines={2}>
            {profile.businessName}
          </Text>
          <Text variant="bodySmall" color="textSecondary">
            {name(profile.category)}
          </Text>
        </View>
      </View>

      <View style={styles.badges}>
        <Badge
          label={t(profile.isPublished ? 'space.artisan.published' : 'space.artisan.notPublished')}
          tone={profile.isPublished ? 'success' : 'warning'}
          icon={profile.isPublished ? 'eye-outline' : 'eye-off-outline'}
        />
        <Badge
          label={t(`space.artisan.verification.${profile.verificationStatus}`)}
          tone={profile.verificationStatus === 'VERIFIED' ? 'success' : 'neutral'}
          icon="shield-outline"
        />
      </View>

      <View style={styles.meta}>
        <Icon name="location-outline" size={18} color="textSecondary" />
        <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
          {place}
        </Text>
      </View>
      {profile.yearsExperience !== null ? (
        <View style={styles.meta}>
          <Icon name="time-outline" size={18} color="textSecondary" />
          <Text variant="bodySmall" color="textSecondary" style={styles.flex}>
            {t('space.artisan.experience', { count: profile.yearsExperience })}
          </Text>
        </View>
      ) : null}

      {!profile.isPublished ? (
        <Text variant="caption" color="textSecondary">
          {t('space.artisan.notPublishedBody')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  summary: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tradeIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
