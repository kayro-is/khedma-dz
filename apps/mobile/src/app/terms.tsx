import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

/**
 * Conditions d'utilisation et politique de confidentialité.
 * Le texte juridique n'est pas encore rédigé : l'écran le dit explicitement (aucun faux contenu).
 */
export default function TermsScreen() {
  const { t } = useTranslation();
  return (
    <Screen
      edges={['top', 'bottom', 'left', 'right']}
      contentStyle={styles.content}
      header={
        <ScreenHeader
          title={t('auth.legal.title')}
          actions={
            <IconButton
              icon="close"
              accessibilityLabel={t('common.close')}
              onPress={() => router.back()}
            />
          }
        />
      }
    >
      <EmptyState
        icon="document-text-outline"
        title={t('comingSoon.title')}
        description={t('auth.legal.pending')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { justifyContent: 'center' },
});
