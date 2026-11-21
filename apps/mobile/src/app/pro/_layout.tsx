import { Redirect, Stack } from 'expo-router';

import { useSpace } from '@/features/space/SpaceProvider';
import { colors } from '@/theme';

/**
 * Écrans de gestion du profil artisan professionnel (KHD-008). Réservés aux comptes dont le rôle
 * ARTISAN est confirmé par Supabase ; les données restent de toute façon protégées par la RLS.
 */
export default function ProLayout() {
  const { isArtisan } = useSpace();
  if (!isArtisan) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
