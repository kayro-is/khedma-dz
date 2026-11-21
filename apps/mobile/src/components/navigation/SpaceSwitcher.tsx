import * as Haptics from 'expo-haptics';
import { useSegments } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useSpace } from '@/features/space/SpaceProvider';
import type { Space } from '@/features/space/spaceState';
import { toast } from '@/store/toastStore';
import { colors, MIN_TOUCH_SIZE, radius, shadows, spacing } from '@/theme';

const SPACE_ICONS: Record<Space, IconName> = { particulier: 'home', artisan: 'construct' };

/** Espace affiché actuellement, d'après la route (et non d'après une préférence). */
export function useCurrentSpace(): Space {
  const segments = useSegments() as string[];
  return segments[0] === 'artisan' ? 'artisan' : 'particulier';
}

const selectHaptic = () => void Haptics.selectionAsync().catch(() => undefined);

/** Changement d'espace depuis l'interface ; message clair si les rôles ne peuvent pas être vérifiés. */
export function useSwitchSpace() {
  const { t } = useTranslation();
  const { switchSpace } = useSpace();
  return async (target: Space) => {
    if ((await switchSpace(target)) === 'unverified') toast.error(t('space.errors.network'));
  };
}

/**
 * Sélecteur Particulier / Artisan (écran « Mon profil »). Un seul compte, une seule session :
 * changer d'espace ne déconnecte pas. Sans rôle ARTISAN confirmé, l'option Artisan mène au
 * parcours d'activation.
 */
export function SpaceSwitcher() {
  const { t } = useTranslation();
  const { isArtisan } = useSpace();
  const switchSpace = useSwitchSpace();
  const current = useCurrentSpace();

  const choose = (space: Space) => {
    if (space === current) return;
    selectHaptic();
    void switchSpace(space);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="h3">{t('space.switcher.title')}</Text>
        <Text variant="bodySmall" color="textSecondary">
          {t('space.switcher.subtitle')}
        </Text>
      </View>

      <View style={styles.segmented} accessibilityRole="radiogroup">
        {(['particulier', 'artisan'] as const).map((space) => {
          const selected = space === current;
          const locked = space === 'artisan' && !isArtisan;
          return (
            <Pressable
              key={space}
              onPress={() => choose(space)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t(`space.names.${space}`)}
              accessibilityHint={
                locked ? t('space.switcher.activateHint') : t('space.switcher.switchHint')
              }
              style={({ pressed }) => [
                styles.segment,
                selected && styles.segmentSelected,
                pressed && !selected && styles.segmentPressed,
              ]}
            >
              <Icon
                name={SPACE_ICONS[space]}
                size={20}
                color={selected ? 'onPrimary' : locked ? 'textSecondary' : 'primary'}
              />
              <Text variant="bodyStrong" color={selected ? 'onPrimary' : 'textPrimary'}>
                {t(`space.names.${space}`)}
              </Text>
              {locked ? <Icon name="add-circle-outline" size={16} color="textSecondary" /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text variant="caption" color="textSecondary">
        {t(`space.switcher.current.${current}`)}
      </Text>

      {!isArtisan ? (
        <Button
          label={t('space.switcher.activate')}
          icon="construct-outline"
          variant="secondary"
          size="sm"
          fullWidth
          onPress={() => void switchSpace('artisan')}
        />
      ) : null}
    </View>
  );
}

/**
 * Bouton compact d'en-tête : bascule vers l'autre espace en un geste depuis l'accueil.
 * Sans rôle ARTISAN, il propose « Devenir artisan ».
 */
export function SpaceSwitchButton() {
  const { t } = useTranslation();
  const { isArtisan } = useSpace();
  const switchSpace = useSwitchSpace();
  const current = useCurrentSpace();
  const target: Space = current === 'artisan' ? 'particulier' : 'artisan';
  const label =
    target === 'artisan' && !isArtisan
      ? t('space.switchButton.becomeArtisan')
      : t(`space.names.${target}`);

  return (
    <Pressable
      onPress={() => {
        selectHaptic();
        void switchSpace(target);
      }}
      accessibilityRole="button"
      accessibilityLabel={t(`space.switchButton.a11y.${target}`)}
      hitSlop={8}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
    >
      <Icon name="swap-horizontal" size={16} color="primaryDark" />
      <Text variant="label" color="primaryDark" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: { gap: spacing.xxs },
  segmented: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  segmentSelected: { backgroundColor: colors.primary, ...shadows.card },
  segmentPressed: { backgroundColor: colors.border },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
  },
  pillPressed: { opacity: 0.7 },
});
