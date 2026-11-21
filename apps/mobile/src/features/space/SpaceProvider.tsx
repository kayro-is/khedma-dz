import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { fetchMyRoles, type MyRoles } from './spaceApi';
import {
  isArtisanConfirmed,
  parseStoredSpace,
  resolveSpace,
  spaceStorageKey,
  switchTarget,
  toRolesSnapshot,
  type RolesSnapshot,
  type Space,
  type SpaceResolution,
} from './spaceState';

export const spaceKeys = {
  roles: (userId: string) => ['roles', userId] as const,
  artisanProfile: (userId: string) => ['artisan-profile', userId] as const,
};

export type SwitchResult = 'ok' | 'unverified';

type SpaceContextValue = {
  /** Espace à ouvrir (écran d'entrée). */
  resolution: SpaceResolution;
  /** Rôle ARTISAN confirmé par le serveur pendant cette session (seule source d'autorisation). */
  isArtisan: boolean;
  roles: RolesSnapshot;
  rolesRefreshing: boolean;
  /** Relit les rôles sur le serveur (après activation, ou bouton « Réessayer »). */
  refreshRoles: () => Promise<MyRoles | undefined>;
  /**
   * Change d'espace : mémorise la préférence puis repasse par l'écran d'entrée, qui ouvre l'espace
   * une fois l'état à jour. Artisan non confirmé → parcours d'activation. `unverified` : rôles
   * impossibles à lire (réseau), rien n'est ouvert.
   */
  switchSpace: (target: Space) => Promise<SwitchResult>;
};

const SpaceContext = createContext<SpaceContextValue | null>(null);

async function readPreference(userId: string): Promise<Space> {
  try {
    return parseStoredSpace(await AsyncStorage.getItem(spaceStorageKey(userId)));
  } catch {
    return 'particulier';
  }
}

async function writePreference(userId: string, space: Space) {
  // Échec d'écriture sans gravité : seule la mémorisation au prochain démarrage est perdue.
  await AsyncStorage.setItem(spaceStorageKey(userId), space).catch(() => undefined);
}

/** Supprime la préférence d'espace d'un compte (suppression du compte). */
export async function clearSpacePreference(userId: string) {
  await AsyncStorage.removeItem(spaceStorageKey(userId)).catch(() => undefined);
}

/**
 * Espace actif Particulier / Artisan pour l'unique compte connecté (une seule session).
 * La préférence locale ne sert qu'à choisir l'écran ; l'autorisation vient de Supabase.
 */
export function SpaceProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();
  const [preference, setPreference] = useState<{ userId: string; space: Space } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void readPreference(userId).then((space) => {
      if (!cancelled) setPreference({ userId, space });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const rolesQuery = useQuery({
    queryKey: spaceKeys.roles(userId ?? 'anonymous'),
    queryFn: () => fetchMyRoles(userId as string),
    enabled: userId !== null,
    staleTime: 5 * 60 * 1000,
  });
  const { data: rolesData, isError: rolesError } = rolesQuery;
  const roles = useMemo(
    () => toRolesSnapshot({ data: rolesData, isError: rolesError }),
    [rolesData, rolesError],
  );
  const isArtisan = isArtisanConfirmed(roles);
  // Préférence d'un autre compte (changement d'utilisateur) : ignorée tant que la bonne n'est pas lue.
  const preferred = preference && preference.userId === userId ? preference.space : null;
  const resolution = useMemo(() => resolveSpace(preferred, roles), [preferred, roles]);

  // Préférence Artisan sans rôle sur le serveur (stockage modifié, rôle retiré) : l'écran affiche
  // déjà l'espace Particulier (resolveSpace) ; le stockage est corrigé pour les démarrages suivants.
  useEffect(() => {
    if (userId && preferred === 'artisan' && roles.status === 'success' && !roles.isArtisan) {
      void writePreference(userId, 'particulier');
    }
  }, [userId, preferred, roles]);

  const { refetch } = rolesQuery;
  const refreshRoles = useCallback(async () => (await refetch()).data, [refetch]);

  const switchSpace = useCallback(
    async (target: Space): Promise<SwitchResult> => {
      if (!userId) return 'unverified';
      // Rôles les plus récents du cache (ex. juste après l'activation), sinon l'état affiché.
      const cached = queryClient.getQueryData<MyRoles>(spaceKeys.roles(userId));
      let latest = cached ? toRolesSnapshot({ data: cached, isError: false }) : roles;
      // Rôles inconnus (réseau) : nouvelle lecture avant de décider, jamais d'activation à l'aveugle.
      if (target === 'artisan' && latest.status !== 'success') {
        const fresh = await refreshRoles();
        if (!fresh) return 'unverified';
        latest = { status: 'success', isArtisan: fresh.isArtisan };
      }
      const destination = switchTarget(target, latest);
      if (destination === '/account/become-artisan') {
        router.push(destination);
        return 'ok';
      }
      setPreference({ userId, space: target });
      await writePreference(userId, target);
      // Historique vidé : le bouton retour ne ramène pas dans l'espace précédent.
      if (router.canDismiss()) router.dismissAll();
      router.replace('/');
      return 'ok';
    },
    [userId, roles, queryClient, refreshRoles],
  );

  // Rôles et profil artisan relus à chaque connexion (aucune donnée d'un compte précédent).
  useEffect(() => {
    if (!userId) queryClient.removeQueries({ queryKey: ['roles'] });
  }, [userId, queryClient]);

  const value = useMemo<SpaceContextValue>(
    () => ({
      resolution,
      isArtisan,
      roles,
      rolesRefreshing: rolesQuery.isFetching,
      refreshRoles,
      switchSpace,
    }),
    [resolution, isArtisan, roles, rolesQuery.isFetching, refreshRoles, switchSpace],
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace(): SpaceContextValue {
  const context = useContext(SpaceContext);
  if (!context) throw new Error('useSpace doit être utilisé dans <SpaceProvider>.');
  return context;
}
