import { Redirect, Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tabIcon, tabScreenOptions } from '@/components/navigation/tabOptions';
import { useSpace } from '@/features/space/SpaceProvider';
import { useDirection } from '@/hooks/useDirection';

/**
 * Espace Artisan : navigation inférieure. Réservé aux comptes dont le rôle ARTISAN est confirmé
 * par Supabase (double protection avec la garde de app/_layout.tsx ; les données restent
 * protégées par la RLS quoi qu'il arrive côté application).
 */
export default function ArtisanLayout() {
  const { t } = useTranslation();
  const { script } = useDirection();
  const { isArtisan } = useSpace();

  if (!isArtisan) return <Redirect href="/" />;

  return (
    <Tabs screenOptions={tabScreenOptions(script)}>
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.dashboard'), tabBarIcon: tabIcon('grid') }}
      />
      <Tabs.Screen
        name="demandes"
        options={{ title: t('nav.requests'), tabBarIcon: tabIcon('megaphone') }}
      />
      <Tabs.Screen
        name="propositions"
        options={{ title: t('nav.proposals'), tabBarIcon: tabIcon('pricetags') }}
      />
      <Tabs.Screen
        name="messages"
        options={{ title: t('nav.messages'), tabBarIcon: tabIcon('chatbubbles') }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t('nav.profile'), tabBarIcon: tabIcon('person') }}
      />
    </Tabs>
  );
}
