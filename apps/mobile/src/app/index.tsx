import { Redirect, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { LanguageToggle } from '@/components/auth/LanguageToggle';
import { SpaceGate } from '@/components/navigation/SpaceGate';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { resolveEntryRoute } from '@/features/auth/authState';
import { isJustConfirmed } from '@/features/auth/pendingConfirmation';
import { useSpace } from '@/features/space/SpaceProvider';
import { SPACE_HOME } from '@/features/space/spaceState';
import { hasChosenLocale } from '@/i18n';
import { colors, radius, shadows, spacing } from '@/theme';

const VALUES: { icon: IconName; key: 'valueNearby' | 'valueQuotes' | 'valueSafe' }[] = [
  { icon: 'location-outline', key: 'valueNearby' },
  { icon: 'pricetags-outline', key: 'valueQuotes' },
  { icon: 'shield-checkmark-outline', key: 'valueSafe' },
];

/**
 * Accueil public et écran d'entrée. Redirige vers le choix de langue (1er lancement) ou vers
 * l'espace connecté : Particulier par défaut, Artisan si c'était le dernier espace utilisé ET
 * que Supabase confirme le rôle ARTISAN.
 */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { status, passwordRecovery } = useAuth();
  const { resolution } = useSpace();
  const reduceMotion = useReducedMotion();

  const target = resolveEntryRoute({
    hasChosenLocale: hasChosenLocale(),
    status,
    passwordRecovery,
  });
  if (target === 'space') {
    // Confirmation d'adresse tout juste établie par Supabase : message de réussite d'abord.
    if (isJustConfirmed()) return <Redirect href="/email-confirmed" />;
    if (resolution.kind === 'ready') return <Redirect href={SPACE_HOME[resolution.space]} />;
    return <SpaceGate kind={resolution.kind} />;
  }
  if (target) return <Redirect href={target} />;

  return (
    <Screen scroll edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.content}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <BrandMark size={40} />
          <View>
            <Text variant="h3">{t('app.name')}</Text>
            <Text variant="caption" color="textSecondary">
              {t('app.nameAlt')}
            </Text>
          </View>
        </View>
        <LanguageToggle />
      </View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(380)}
        style={styles.hero}
      >
        <View style={styles.heroBadge}>
          <Icon name="construct" size={36} color="onPrimary" />
        </View>
        <Text variant="display" accessibilityRole="header">
          {t('auth.welcome.headline')}
        </Text>
        <Text variant="body" color="textSecondary">
          {t('auth.welcome.subtitle')}
        </Text>
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInDown.duration(380).delay(120)}
        style={styles.values}
      >
        {VALUES.map(({ icon, key }) => (
          <View key={key} style={styles.valueRow}>
            <View style={styles.valueIcon}>
              <Icon name={icon} size={20} color="primary" />
            </View>
            <Text variant="bodyStrong" style={styles.flex}>
              {t(`auth.welcome.${key}`)}
            </Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : FadeInUp.duration(380).delay(200)}
        style={styles.actions}
      >
        <Button
          label={t('auth.welcome.createAccount')}
          size="lg"
          fullWidth
          iconEnd="arrow-forward"
          iconEndFlipInRTL
          onPress={() => router.push('/sign-up')}
        />
        <Button
          label={t('auth.welcome.signIn')}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={() => router.push('/sign-in')}
        />
        <Text variant="caption" color="textSecondary" align="center">
          {t('auth.welcome.legal')}
        </Text>
      </Animated.View>

      {__DEV__ ? (
        <View style={styles.devTools}>
          <Text variant="label" color="textSecondary">
            {t('welcome.devTools')}
          </Text>
          <Button
            label={t('welcome.openCatalog')}
            icon="color-palette-outline"
            variant="ghost"
            onPress={() => router.push('/dev/ui')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, gap: spacing.xxl },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hero: { gap: spacing.md, marginTop: spacing.lg },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...shadows.raised,
  },
  values: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  valueIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  actions: { gap: spacing.md },
  devTools: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
});
