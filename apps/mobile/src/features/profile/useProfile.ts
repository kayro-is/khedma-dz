import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ProfileUpdateValues } from '@khedma/validation';

import { useAuth } from '@/features/auth/AuthProvider';

import {
  avatarPublicUrl,
  fetchCommunes,
  fetchMyProfile,
  fetchWilayas,
  removeAvatar,
  replaceAvatar,
  updateMyProfile,
  type MyProfile,
} from './profileApi';

export const profileKeys = {
  me: (userId: string) => ['profile', userId] as const,
  wilayas: ['geo', 'wilayas'] as const,
  communes: (wilayaId: number) => ['geo', 'communes', wilayaId] as const,
};

function useCurrentUser() {
  const { session } = useAuth();
  const user = session?.user;
  if (!user) throw new Error('Utilisateur non connecté.');
  return { userId: user.id, email: user.email ?? '' };
}

export function useMyProfile() {
  const { userId, email } = useCurrentUser();
  return useQuery({
    queryKey: profileKeys.me(userId),
    queryFn: () => fetchMyProfile(userId, email),
  });
}

/** Référentiels géographiques : changent rarement, gardés en cache 24 h. */
export function useWilayas() {
  return useQuery({
    queryKey: profileKeys.wilayas,
    queryFn: fetchWilayas,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCommunes(wilayaId: number | null) {
  return useQuery({
    queryKey: profileKeys.communes(wilayaId ?? 0),
    queryFn: () => fetchCommunes(wilayaId as number),
    enabled: wilayaId !== null,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useUpdateProfile() {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ProfileUpdateValues) => updateMyProfile(userId, values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.me(userId) }),
  });
}

export function useAvatarMutations(currentPath: string | null) {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: profileKeys.me(userId) });
  return {
    replace: useMutation({
      mutationFn: (bytes: Uint8Array) => replaceAvatar(userId, currentPath, bytes),
      // Affichage immédiat de la nouvelle photo (URL unique par envoi : aucun cache périmé),
      // puis relecture du profil sur le serveur pour confirmation.
      onSuccess: (path) => {
        queryClient.setQueryData<MyProfile>(profileKeys.me(userId), (previous) =>
          previous ? { ...previous, avatarPath: path, avatarUrl: avatarPublicUrl(path) } : previous,
        );
        return invalidate();
      },
    }),
    remove: useMutation({
      mutationFn: () => removeAvatar(userId, currentPath),
      onSuccess: invalidate,
    }),
  };
}
