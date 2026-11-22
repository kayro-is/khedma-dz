import { ProfileScreen } from '@/components/navigation/ProfileScreen';
import { BACK_FALLBACK, safeBack } from '@/lib/navigation';

/** Compte et paramètres (photo, informations personnelles, langue, sécurité), depuis l'espace Artisan. */
export default function AccountSettingsScreen() {
  return <ProfileScreen onBack={() => safeBack(BACK_FALLBACK.entry)} />;
}
