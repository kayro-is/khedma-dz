import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { tabIcon, tabScreenOptions } from '@/components/navigation/tabOptions';
import { useDirection } from '@/hooks/useDirection';

/** Espace Particulier (par défaut) : navigation inférieure, accessible à tout compte connecté. */
export default function ParticulierLayout() {
  const { t } = useTranslation();
  const { script } = useDirection();

  return (
    <Tabs screenOptions={tabScreenOptions(script)}>
      <Tabs.Screen name="index" options={{ title: t('nav.home'), tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen
        name="recherche"
        options={{ title: t('nav.search'), tabBarIcon: tabIcon('search') }}
      />
      <Tabs.Screen
        name="demandes"
        options={{ title: t('nav.myRequests'), tabBarIcon: tabIcon('document-text') }}
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
