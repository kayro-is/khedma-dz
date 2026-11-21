import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Parcours d'authentification (accessible uniquement sans session, voir app/_layout.tsx). */
export default function AuthGroupLayout() {
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
