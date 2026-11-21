import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ArtisanActivationValues } from '@khedma/validation';

import { useAuth } from '@/features/auth/AuthProvider';

import { activateArtisanSpace, fetchMyArtisanProfile } from './spaceApi';
import { spaceKeys, useSpace } from './SpaceProvider';

function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('Utilisateur non connecté.');
  return session.user.id;
}

/** Profil artisan de l'utilisateur (null s'il n'a pas activé l'espace Artisan). */
export function useMyArtisanProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: spaceKeys.artisanProfile(userId),
    queryFn: () => fetchMyArtisanProfile(userId),
  });
}

/**
 * Activation de l'espace Artisan, puis relecture du rôle sur le serveur : l'espace ne s'ouvre
 * que si Supabase confirme le rôle ARTISAN attribué par son trigger.
 */
export function useActivateArtisan() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { refreshRoles } = useSpace();
  return useMutation({
    mutationFn: async (values: ArtisanActivationValues) => {
      await activateArtisanSpace(userId, values);
      const roles = await refreshRoles();
      if (!roles?.isArtisan) throw new Error('role_not_confirmed');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: spaceKeys.artisanProfile(userId) }),
  });
}
