import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export type ToastItem = {
  id: number;
  type: ToastType;
  /** Texte déjà traduit. */
  message: string;
  durationMs: number;
};

type ToastState = {
  current: ToastItem | null;
  show: (toast: Omit<ToastItem, 'id' | 'durationMs'> & { durationMs?: number }) => void;
  hide: (id: number) => void;
};

let nextId = 1;

/** Un seul toast visible à la fois : le plus récent remplace le précédent. */
export const useToastStore = create<ToastState>((set) => ({
  current: null,
  show: ({ durationMs, ...toast }) =>
    set({ current: { ...toast, id: nextId++, durationMs: durationMs ?? 3500 } }),
  hide: (id) => set((state) => (state.current?.id === id ? { current: null } : state)),
}));

/** API impérative, utilisable hors composants (ex. callbacks de mutations TanStack Query). */
export const toast = {
  success: (message: string, durationMs?: number) =>
    useToastStore.getState().show({ type: 'success', message, durationMs }),
  error: (message: string, durationMs?: number) =>
    useToastStore.getState().show({ type: 'error', message, durationMs: durationMs ?? 5000 }),
  info: (message: string, durationMs?: number) =>
    useToastStore.getState().show({ type: 'info', message, durationMs }),
};
