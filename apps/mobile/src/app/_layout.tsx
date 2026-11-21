import Ionicons from '@expo/vector-icons/Ionicons';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_500Medium } from '@expo-google-fonts/noto-sans-arabic/500Medium';
import { NotoSansArabic_600SemiBold } from '@expo-google-fonts/noto-sans-arabic/600SemiBold';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ui/Toast';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { SpaceProvider, useSpace } from '@/features/space/SpaceProvider';
import { QueryProvider } from '@/services/queryClient';
import i18n, { initI18n } from '@/i18n';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSansArabic_400Regular,
    NotoSansArabic_500Medium,
    NotoSansArabic_600SemiBold,
    NotoSansArabic_700Bold,
    ...Ionicons.font,
  });

  useEffect(() => {
    let cancelled = false;
    initI18n()
      .catch((error: unknown) => {
        // L'application reste utilisable en français si l'initialisation échoue.
        console.error('[i18n] Initialisation impossible', error);
      })
      .finally(() => {
        if (!cancelled) setI18nReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (fontError)
      console.error('[fonts] Chargement impossible, polices système utilisées', fontError);
  }, [fontError]);

  // En cas d'échec du chargement des polices, l'application démarre avec les polices système.
  const ready = i18nReady && (fontsLoaded || fontError !== null);

  if (!ready) return null;

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <AuthProvider>
          <QueryProvider>
            <SpaceProvider>
              <StatusBar style="dark" />
              <RootNavigator />
              <ToastHost />
            </SpaceProvider>
          </QueryProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

/**
 * Gardes de navigation : sans session, les espaces Particulier / Artisan sont inaccessibles
 * (redirection vers la connexion) ; avec session, les écrans de connexion le sont.
 * L'espace Artisan n'existe dans la navigation que si Supabase a confirmé le rôle ARTISAN
 * pendant la session (jamais d'après le stockage local) ; sinon, retour à l'écran d'entrée.
 * Le splash reste affiché tant que la session n'a pas été lue dans le stockage chiffré.
 */
function RootNavigator() {
  const { status } = useAuth();
  const { isArtisan } = useSpace();
  const signedIn = status === 'signedIn';

  useEffect(() => {
    if (status !== 'initializing') void SplashScreen.hideAsync();
  }, [status]);

  if (status === 'initializing') return null;

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(onboarding)/language" />
      <Stack.Screen name="auth-callback" />
      <Stack.Screen name="terms" options={{ presentation: 'modal' }} />

      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={signedIn} redirectTo="/sign-in">
        <Stack.Screen name="particulier" />
        <Stack.Protected guard={isArtisan}>
          <Stack.Screen name="artisan" />
          <Stack.Screen name="pro" />
        </Stack.Protected>
        <Stack.Screen name="account" />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>

      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="dev/ui" />
      </Stack.Protected>
    </Stack>
  );
}
