import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useDirection } from '@/hooks/useDirection';
import { useLanguageSwitch } from '@/hooks/useLanguageSwitch';
import { colors, radius, spacing } from '@/theme';

/** Bouton compact « العربية » / « Français » : bascule vers l'autre langue, visible dès l'accueil. */
export function LanguageToggle() {
  const { t } = useTranslation();
  const { locale } = useDirection();
  const { switchTo, switching } = useLanguageSwitch();
  const target = locale === 'fr' ? 'ar' : 'fr';

  return (
    <PressableScale
      onPress={() => void switchTo(target)}
      disabled={switching}
      accessibilityRole="button"
      accessibilityLabel={t('auth.languageSwitchA11y')}
      accessibilityValue={{ text: t(`language.${target}`) }}
      accessibilityLanguage={target}
      hitSlop={8}
      style={styles.pill}
    >
      {switching ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name="language-outline" size={16} color="primary" />
      )}
      <Text variant="label" color="primaryDark">
        {t(`language.${target}`)}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
