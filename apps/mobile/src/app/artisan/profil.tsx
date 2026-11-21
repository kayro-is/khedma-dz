import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ARTISAN_RULES } from '@khedma/validation';

import { SpaceSwitchButton } from '@/components/navigation/SpaceSwitcher';
import { PublicationCard } from '@/components/pro/PublicationCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { Skeleton } from '@/components/ui/LoadingSkeleton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { ProProfile } from '@/features/artisan/proProfileApi';
import { proErrorKey } from '@/features/artisan/proProfileLogic';
import { useProProfile } from '@/features/artisan/useProProfile';
import { useMyProfile } from '@/features/profile/useProfile';
import { useDirection } from '@/hooks/useDirection';
import { colors, radius, shadows, spacing } from '@/theme';

/** Onglet « Profil » de l'espace Artisan : gestion du profil professionnel (KHD-008). */
export default function ArtisanProfileHub() {
  const { t } = useTranslation();
  const pro = useProProfile();

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title={t('pro.hub.title')}
          actions={
            <>
              <SpaceSwitchButton />
              <IconButton
                icon="eye-outline"
                accessibilityLabel={t('pro.hub.preview')}
                onPress={() => router.push('/pro/preview')}
              />
            </>
          }
        />
      }
      contentStyle={styles.content}
    >
      {pro.isPending ? (
        <HubSkeleton />
      ) : pro.isError || !pro.data ? (
        <ErrorState
          kind={proErrorKey(pro.error) === 'network' ? 'network' : 'generic'}
          title={t('space.artisan.loadError')}
          onRetry={() => void pro.refetch()}
          retrying={pro.isFetching}
        />
      ) : (
        <HubContent profile={pro.data} />
      )}
    </Screen>
  );
}

function HubContent({ profile }: { profile: ProProfile }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const me = useMyProfile();
  const name = (value: { nameFr: string; nameAr: string } | undefined) =>
    value ? (locale === 'ar' ? value.nameAr : value.nameFr) : '';
  const primary = profile.services.find((s) => s.categoryId === profile.primaryCategoryId);
  const secondaryCount = profile.services.length - (primary ? 1 : 0);
  const hasAvatar = !!me.data?.avatarUrl;

  return (
    <>
      <View style={styles.identity}>
        <Avatar
          name={profile.businessName}
          uri={me.data?.avatarUrl}
          size={72}
          verified={profile.verificationStatus === 'VERIFIED'}
        />
        <View style={styles.flex}>
          <Text variant="h2" numberOfLines={2}>
            {profile.businessName}
          </Text>
          <Text variant="bodySmall" color="textSecondary">
            {name(primary)}
          </Text>
          <View style={styles.badges}>
            <Badge
              label={t(`space.artisan.verification.${profile.verificationStatus}`)}
              tone={profile.verificationStatus === 'VERIFIED' ? 'success' : 'neutral'}
              icon="shield-outline"
            />
            <Badge label={t(`pro.availability.${profile.availability}`)} tone="primary" />
          </View>
        </View>
      </View>
      {profile.verificationStatus !== 'VERIFIED' ? (
        <Text variant="caption" color="textSecondary">
          {t('pro.hub.verificationNote')}
        </Text>
      ) : null}

      <PublicationCard profile={profile} hasAvatar={hasAvatar} />

      <ListSection title={t('pro.hub.sections')}>
        <ListRow
          icon="briefcase-outline"
          label={t('pro.hub.info')}
          description={
            profile.description
              ? profile.description.slice(0, 80) + (profile.description.length > 80 ? '…' : '')
              : t('pro.hub.infoEmpty')
          }
          onPress={() => router.push('/pro/edit')}
        />
        <ListRow
          icon="hammer-outline"
          label={t('pro.hub.trades')}
          value={t('pro.hub.tradesValue', { count: secondaryCount })}
          onPress={() => router.push('/pro/trades')}
        />
        <ListRow
          icon="map-outline"
          label={t('pro.hub.zones')}
          value={`${profile.zones.length} / ${ARTISAN_RULES.zonesMax}`}
          onPress={() => router.push('/pro/zones')}
        />
        <ListRow
          icon="images-outline"
          label={t('pro.hub.gallery')}
          value={`${profile.portfolio.length} / ${ARTISAN_RULES.portfolioMax}`}
          onPress={() => router.push('/pro/gallery')}
        />
        <ListRow
          icon="eye-outline"
          label={t('pro.hub.preview')}
          description={t('pro.hub.previewHint')}
          onPress={() => router.push('/pro/preview')}
        />
      </ListSection>

      <ListSection title={t('pro.hub.account')}>
        <ListRow
          icon="camera-outline"
          label={t('pro.hub.photo')}
          description={t('pro.hub.photoHint')}
          onPress={() => router.push('/account/settings')}
        />
        <ListRow
          icon="settings-outline"
          label={t('pro.hub.settings')}
          onPress={() => router.push('/account/settings')}
        />
      </ListSection>
    </>
  );
}

function HubSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityState={{ busy: true }}>
      <View style={styles.identity}>
        <Skeleton width={72} height={72} borderRadius={36} />
        <View style={[styles.flex, styles.skeletonLines]}>
          <Skeleton width="70%" height={20} />
          <Skeleton width="40%" />
        </View>
      </View>
      <Skeleton height={260} borderRadius={radius.xl} />
      <Skeleton height={220} borderRadius={radius.lg} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  flex: { flex: 1, gap: spacing.xxs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  skeleton: { gap: spacing.xl },
  skeletonLines: { gap: spacing.sm },
});
