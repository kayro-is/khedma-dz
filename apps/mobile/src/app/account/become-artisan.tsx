import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Text } from '@/components/ui/Text';
import { useSpace } from '@/features/space/SpaceProvider';
import { colors, radius, shadows, spacing } from '@/theme';

const BENEFITS: { icon: IconName; key: 'sameAccount' | 'switchAnytime' | 'private' }[] = [
  { icon: 'person-circle-outline', key: 'sameAccount' },
  { icon: 'swap-horizontal-outline', key: 'switchAnytime' },
  { icon: 'eye-off-outline', key: 'private' },
];

const UPCOMING = ['requests', 'verification'] as const;

/** Bienvenue dans l'espace Artisan : explique l'activation, sans promettre ce qui n'existe pas encore. */
export default function BecomeArtisanScreen() {
  const { t } = useTranslation();
  const { isArtisan } = useSpace();
  const reduceMotion = useReducedMotion();

  // Déjà artisan (autre appareil, retour arrière) : directement l'espace via l'écran d'entrée.
  if (isArtisan) return <Redirect href="/" />;

  return (
    <Screen
      scroll
      edges={['top', 'bottom', 'left', 'right']}
      header={<ScreenHeader title={t('space.welcome.screenTitle')} onBack={() => router.back()} />}
      contentStyle={styles.content}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(360)}
        style={styles.hero}
      >
        <View style={styles.heroIcon}>
          <Icon name="construct" size={36} color="onPrimary" />
        </View>
        <Text variant="h1" accessibilityRole="header">
          {t('space.welcome.title')}
        </Text>
        <Text variant="body" color="textSecondary">
          {t('space.welcome.subtitle')}
        </Text>
      </Animated.View>

      <View style={styles.card}>
        {BENEFITS.map(({ icon, key }) => (
          <View key={key} style={styles.row}>
            <View style={styles.rowIcon}>
              <Icon name={icon} size={20} color="primary" />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyStrong">{t(`space.welcome.benefits.${key}.title`)}</Text>
              <Text variant="bodySmall" color="textSecondary">
                {t(`space.welcome.benefits.${key}.body`)}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.upcoming}>
        <Text variant="label" color="textSecondary">
          {t('space.welcome.upcomingTitle')}
        </Text>
        {UPCOMING.map((key) => (
          <View key={key} style={styles.upcomingRow}>
            <Text variant="bodySmall" style={styles.flex}>
              {t(`space.welcome.upcoming.${key}`)}
            </Text>
            <Badge label={t('common.soon')} tone="neutral" />
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <Button
          label={t('space.welcome.start')}
          size="lg"
          fullWidth
          iconEnd="arrow-forward"
          iconEndFlipInRTL
          onPress={() => router.push('/account/artisan-setup')}
        />
        <Button
          label={t('space.welcome.later')}
          variant="ghost"
          fullWidth
          onPress={() => router.back()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl },
  hero: { gap: spacing.md },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...shadows.raised,
  },
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  upcoming: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { gap: spacing.sm },
});
