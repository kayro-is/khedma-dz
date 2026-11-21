import {
  focusManager,
  QueryClient,
  QueryClientProvider as TanStackProvider,
} from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Réseau mobile parfois instable : 2 nouvelles tentatives, données jugées fraîches 1 minute.
        retry: 2,
        staleTime: 60_000,
      },
      mutations: { retry: 0 },
    },
  });
}

/**
 * Cache des données serveur (TanStack Query).
 * - Rafraîchissement au retour de l'application au premier plan.
 * - Cache vidé à la déconnexion : aucune donnée d'un compte ne reste visible pour le suivant.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  const { status } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (status === 'signedOut') client.clear();
  }, [status, client]);

  return <TanStackProvider client={client}>{children}</TanStackProvider>;
}
