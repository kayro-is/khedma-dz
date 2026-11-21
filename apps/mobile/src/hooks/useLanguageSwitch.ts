import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import type { Locale } from '@khedma/types';

import { syncMyLocale } from '@/features/profile/profileApi';
import { applyLocale, restartApp } from '@/i18n';

/**
 * Change la langue de l'application. Si le sens de lecture change (fr ↔ ar), React Native
 * impose un redémarrage : il est expliqué à l'utilisateur, dans la nouvelle langue, avant d'être lancé.
 */
export function useLanguageSwitch() {
  const { t } = useTranslation();
  const [switching, setSwitching] = useState(false);

  const switchTo = useCallback(
    async (locale: Locale): Promise<{ restartRequired: boolean }> => {
      setSwitching(true);
      try {
        const result = await applyLocale(locale);
        // Langue enregistrée dans le profil (notifications, e-mails) ; sans effet si non connecté.
        await syncMyLocale(locale).catch(() => undefined);
        if (result.restartRequired) {
          Alert.alert(
            t('language.restartTitle'),
            t('language.restartMessage'),
            [
              {
                text: t('language.restartConfirm'),
                onPress: () => {
                  restartApp().catch(() =>
                    Alert.alert(t('common.error'), t('language.restartFailed')),
                  );
                },
              },
            ],
            { cancelable: false },
          );
        }
        return result;
      } catch {
        Alert.alert(t('common.error'));
        return { restartRequired: false };
      } finally {
        setSwitching(false);
      }
    },
    [t],
  );

  return { switchTo, switching };
}
