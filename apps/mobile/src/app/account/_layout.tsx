import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Écrans de gestion du compte (accessibles uniquement connecté, voir app/_layout.tsx). */
export default function AccountLayout() {
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
