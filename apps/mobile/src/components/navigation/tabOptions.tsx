import Ionicons from '@expo/vector-icons/Ionicons';
import type { ColorValue } from 'react-native';

import type { IconName } from '@/components/ui/Icon';
import { colors, fontFamilyFor, type Script } from '@/theme';

/** Options communes aux barres d'onglets des espaces Particulier et Artisan. */
export function tabScreenOptions(script: Script) {
  return {
    headerShown: false,
    tabBarActiveTintColor: colors.primary,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: {
      backgroundColor: colors.surface,
      borderTopColor: colors.border,
    },
    tabBarLabelStyle: { fontFamily: fontFamilyFor(script, 'medium'), fontSize: 11 },
    tabBarAllowFontScaling: false,
  };
}

/** Icône pleine pour l'onglet actif, contour sinon. */
export function tabIcon(name: string) {
  function TabBarIcon({
    focused,
    color,
    size,
  }: {
    focused: boolean;
    color: ColorValue;
    size: number;
  }) {
    const iconName = (focused ? name : `${name}-outline`) as IconName;
    return (
      <Ionicons
        name={iconName}
        size={size}
        color={typeof color === 'string' ? color : colors.textSecondary}
      />
    );
  }
  return TabBarIcon;
}
