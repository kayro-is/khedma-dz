import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SUPPORTED_LOCALES, type Locale } from '@khedma/types';

import { RadioGroup } from '@/components/form/RadioGroup';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useLanguageSwitch } from '@/hooks/useLanguageSwitch';
import { currentLocale } from '@/i18n';
import { spacing } from '@/theme';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Locale>(currentLocale());
  // Logique partagée : enregistrement, synchronisation du profil, redémarrage RTL expliqué.
  const { switchTo, switching } = useLanguageSwitch();

  const onContinue = async () => {
    const { restartRequired } = await switchTo(selected);
    if (restartRequired) return;
    safeBack(BACK_FALLBACK.entry);
  };

  return (
    <Screen edges={['top', 'bottom', 'left', 'right']} contentStyle={styles.content}>
      <View style={styles.header}>
        <Text variant="h1" align="center" accessibilityRole="header">
          {t('language.title')}
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          {t('language.subtitle')}
        </Text>
      </View>

      <RadioGroup
        options={SUPPORTED_LOCALES.map((locale) => ({
          value: locale,
          label: t(`language.${locale}`),
          lang: locale,
        }))}
        value={selected}
        onChange={setSelected}
      />

      <Button
        label={t('language.continue')}
        size="lg"
        fullWidth
        loading={switching}
        onPress={() => void onContinue()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center', gap: spacing.xl, paddingHorizontal: spacing.xl },
  header: { gap: spacing.sm },
});
