import { router } from 'expo-router';

import { ProfileScreen } from '@/components/navigation/ProfileScreen';

/** Compte et paramètres (photo, informations personnelles, langue, sécurité), depuis l'espace Artisan. */
export default function AccountSettingsScreen() {
  return <ProfileScreen onBack={() => router.back()} />;
}
