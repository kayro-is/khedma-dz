import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { FormAlert } from '@/components/auth/FormAlert';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/ErrorState';
import { Icon } from '@/components/ui/Icon';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { RatingStars } from '@/components/ui/RatingStars';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import type { ProProfile } from '@/features/artisan/proProfileApi';
import { groupZonesByWilaya } from '@/features/artisan/proProfileLogic';
import { useProProfile } from '@/features/artisan/useProProfile';
import { categoryIcon } from '@/features/categories/categoryIcons';
import { useMyProfile } from '@/features/profile/useProfile';
import { useDirection } from '@/hooks/useDirection';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * Aperçu du profil tel qu'un client le verra (lecture seule). Seules les informations publiques
 * sont affichées : jamais le téléphone professionnel ni les informations personnelles.
 */
export default function ProPreviewScreen() {
  const { t } = useTranslation();
  const pro = useProProfile();
  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={<ScreenHeader title={t('pro.preview.title')} onBack={() => router.back()} />}
      contentStyle={styles.content}
    >
      {pro.isPending ? (
        <LoadingSkeleton count={4} />
      ) : pro.isError || !pro.data ? (
        <ErrorState title={t('space.artisan.loadError')} onRetry={() => void pro.refetch()} />
      ) : (
        <PublicProfile profile={pro.data} />
      )}
    </Screen>
  );
}

function PublicProfile({ profile }: { profile: ProProfile }) {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const me = useMyProfile();
  const label = (named: { nameFr: string; nameAr: string }) =>
    locale === 'ar' ? named.nameAr : named.nameFr;
  const primary = profile.services.find((s) => s.categoryId === profile.primaryCategoryId);
  const secondary = profile.services.filter((s) => s.categoryId !== profile.primaryCategoryId);
  const zones = groupZonesByWilaya(profile.zones, locale);
  const photos = profile.portfolio.filter((p) => p.imageUrl);
  const verified = profile.verificationStatus === 'VERIFIED';

  return (
    <>
      <FormAlert
        tone={profile.isPublished ? 'info' : 'error'}
        message={t(profile.isPublished ? 'pro.preview.liveNote' : 'pro.preview.draftNote')}
      />

      <View style={styles.hero}>
        <Avatar
          name={profile.businessName}
          uri={me.data?.avatarUrl}
          size={88}
          verified={verified}
        />
        <Text variant="h2" align="center">
          {profile.businessName}
        </Text>
        {primary ? (
          <View style={styles.inline}>
            <Icon name={categoryIcon(primary.slug)} size={18} color="primary" />
            <Text variant="bodyStrong" color="primaryDark">
              {label(primary)}
            </Text>
          </View>
        ) : null}
        <View style={styles.badges}>
          {verified ? (
            <Badge
              label={t('space.artisan.verification.VERIFIED')}
              tone="success"
              icon="shield-checkmark"
            />
          ) : null}
          <Badge label={t(`pro.availability.${profile.availability}`)} tone="primary" />
          {profile.yearsExperience !== null ? (
            <Badge
              label={t('space.artisan.experience', { count: profile.yearsExperience })}
              tone="neutral"
            />
          ) : null}
        </View>
        {profile.reviewCount > 0 && profile.ratingAvg !== null ? (
          <View style={styles.inline}>
            <RatingStars value={profile.ratingAvg} size={16} />
            <Text variant="caption" color="textSecondary">
              {t('rating.reviews', { count: profile.reviewCount })}
            </Text>
          </View>
        ) : (
          <Text variant="caption" color="textSecondary">
            {t('pro.preview.noReviews')}
          </Text>
        )}
      </View>

      <Section title={t('pro.preview.about')}>
        <Text variant="body" color={profile.description ? 'textPrimary' : 'textSecondary'}>
          {profile.description ?? t('pro.preview.noDescription')}
        </Text>
      </Section>

      {secondary.length ? (
        <Section title={t('pro.preview.otherTrades')}>
          <View style={styles.badges}>
            {secondary.map((s) => (
              <Badge
                key={s.categoryId}
                label={label(s)}
                tone="neutral"
                icon={categoryIcon(s.slug)}
              />
            ))}
          </View>
        </Section>
      ) : null}

      <Section title={t('pro.preview.zones')}>
        {zones.length ? (
          zones.map((group) => (
            <Text key={group.code} variant="bodySmall">
              <Text variant="bodySmall" color="textSecondary">
                {group.code} · {group.name} —{' '}
              </Text>
              {group.zones.map((z) => label(z)).join(locale === 'ar' ? '، ' : ', ')}
            </Text>
          ))
        ) : (
          <Text variant="bodySmall" color="textSecondary">
            {t('pro.zones.emptyTitle')}
          </Text>
        )}
      </Section>

      <Section title={t('pro.preview.gallery')}>
        {photos.length ? (
          <View style={styles.grid}>
            {photos.map((p) => (
              <View key={p.id} style={styles.tile}>
                <Image
                  source={{ uri: p.imageUrl ?? undefined }}
                  style={styles.image}
                  contentFit="cover"
                />
                {p.caption ? (
                  <Text variant="caption" color="textSecondary" numberOfLines={2}>
                    {p.caption}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <Text variant="bodySmall" color="textSecondary">
            {t('pro.gallery.emptyTitle')}
          </Text>
        )}
      </Section>

      <Text variant="caption" color="textSecondary" align="center">
        {t('pro.preview.contactNote')}
      </Text>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="h3" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  section: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '48%', gap: spacing.xxs },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.skeleton,
  },
});
