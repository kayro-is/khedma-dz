import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SpaceSwitchButton, useSwitchSpace } from '@/components/navigation/SpaceSwitcher';
import { UpcomingList, type UpcomingItem } from '@/components/navigation/UpcomingList';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { useMyProfile } from '@/features/profile/useProfile';
import { useSpace } from '@/features/space/SpaceProvider';
import { colors, radius, shadows, spacing } from '@/theme';

/** Accueil de l'espace Particulier (espace par défaut). */
export default function ParticulierHome() {
  const { t } = useTranslation();
  const profile = useMyProfile();
  const { isArtisan } = useSpace();
  const switchSpace = useSwitchSpace();
  const firstName = profile.data?.firstName;

  const upcoming: UpcomingItem[] = [
    {
      key: 'search',
      icon: 'search-outline',
      title: t('space.particulier.upcoming.search.title'),
      description: t('space.particulier.upcoming.search.body'),
    },
    {
      key: 'request',
      icon: 'document-text-outline',
      title: t('space.particulier.upcoming.request.title'),
      description: t('space.particulier.upcoming.request.body'),
    },
    {
      key: 'quotes',
      icon: 'pricetags-outline',
      title: t('space.particulier.upcoming.quotes.title'),
      description: t('space.particulier.upcoming.quotes.body'),
    },
    {
      key: 'messages',
      icon: 'chatbubbles-outline',
      title: t('space.particulier.upcoming.messages.title'),
      description: t('space.particulier.upcoming.messages.body'),
    },
  ];

  return (
    <Screen
      scroll
      header={
        <ScreenHeader
          title={firstName ? t('space.particulier.greeting', { name: firstName }) : t('nav.home')}
          subtitle={t('space.names.particulier')}
          actions={<SpaceSwitchButton />}
        />
      }
      contentStyle={styles.content}
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="home" size={28} color="onPrimary" />
        </View>
        <Text variant="h2">{t('space.particulier.heroTitle')}</Text>
        <Text variant="body" color="textSecondary">
          {t('space.particulier.heroBody')}
        </Text>
      </View>

      <UpcomingList title={t('space.upcomingTitle')} items={upcoming} />

      <View style={styles.artisanCard}>
        <Icon name="construct-outline" size={24} color="primaryDark" />
        <View style={styles.flex}>
          <Text variant="bodyStrong">
            {t(
              isArtisan
                ? 'space.particulier.artisanCard.switchTitle'
                : 'space.particulier.artisanCard.title',
            )}
          </Text>
          <Text variant="bodySmall" color="textSecondary">
            {t(
              isArtisan
                ? 'space.particulier.artisanCard.switchBody'
                : 'space.particulier.artisanCard.body',
            )}
          </Text>
        </View>
        <Button
          label={t(
            isArtisan
              ? 'space.particulier.artisanCard.switchAction'
              : 'space.particulier.artisanCard.action',
          )}
          size="sm"
          variant="secondary"
          onPress={() => void switchSpace('artisan')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: {
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: colors.primaryLight,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.card,
  },
  artisanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  flex: { flex: 1, gap: spacing.xxs },
});
