import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ArtisanProfileValues, ArtisanTradesValues } from '@khedma/validation';

import { useAuth } from '@/features/auth/AuthProvider';
import { spaceKeys } from '@/features/space/SpaceProvider';

import {
  addPortfolioPhoto,
  deletePortfolioItem,
  fetchProProfile,
  reorderPortfolio,
  saveTrades,
  saveZones,
  setPublished,
  updatePortfolioCaption,
  updateProInfo,
  type ProPortfolioItem,
  type ProProfile,
} from './proProfileApi';

export const proKeys = { profile: (userId: string) => ['pro-profile', userId] as const };

function useUserId(): string {
  const { session } = useAuth();
  if (!session) throw new Error('Utilisateur non connecté.');
  return session.user.id;
}

export function useProProfile() {
  const userId = useUserId();
  return useQuery({
    queryKey: proKeys.profile(userId),
    queryFn: () => fetchProProfile(userId),
  });
}

/** Relecture du profil pro et du résumé du tableau de bord après toute modification. */
function useRefresh() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: proKeys.profile(userId) }),
      queryClient.invalidateQueries({ queryKey: spaceKeys.artisanProfile(userId) }),
    ]);
}

export function useUpdateProInfo() {
  const userId = useUserId();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (values: ArtisanProfileValues) => updateProInfo(userId, values),
    onSettled: refresh,
  });
}

export function useSaveTrades() {
  const userId = useUserId();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { current: ProProfile; values: ArtisanTradesValues }) =>
      saveTrades(
        userId,
        {
          primaryCategoryId: input.current.primaryCategoryId,
          serviceIds: input.current.services.map((s) => s.categoryId),
        },
        input.values,
      ),
    onSettled: refresh,
  });
}

export function useSaveZones() {
  const userId = useUserId();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (input: { currentIds: number[]; nextIds: number[] }) =>
      saveZones(userId, input.currentIds, input.nextIds),
    onSettled: refresh,
  });
}

export function useSetPublished() {
  const userId = useUserId();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (published: boolean) => setPublished(userId, published),
    onSettled: refresh,
  });
}

export function usePortfolioMutations() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const refresh = useRefresh();
  return {
    add: useMutation({
      mutationFn: (input: { bytes: Uint8Array; caption: string | null; sortOrder: number }) =>
        addPortfolioPhoto(userId, input, input.sortOrder),
    }),
    caption: useMutation({
      mutationFn: (input: { itemId: string; caption: string | null }) =>
        updatePortfolioCaption(input.itemId, input.caption),
      onSettled: refresh,
    }),
    remove: useMutation({
      mutationFn: (item: ProPortfolioItem) => deletePortfolioItem(userId, item),
      onSettled: refresh,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) => reorderPortfolio(ids),
      // Affichage immédiat du nouvel ordre ; relecture serveur ensuite.
      onMutate: (ids) => {
        queryClient.setQueryData<ProProfile | null>(proKeys.profile(userId), (previous) =>
          previous
            ? {
                ...previous,
                portfolio: ids
                  .map((id, index) => {
                    const item = previous.portfolio.find((p) => p.id === id);
                    return item ? { ...item, sortOrder: index } : null;
                  })
                  .filter((item): item is ProPortfolioItem => item !== null),
              }
            : previous,
        );
      },
      onSettled: refresh,
    }),
    refresh,
  };
}
