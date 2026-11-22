import { Image, type ImageStyle } from 'expo-image';
import { useRef } from 'react';
import { StyleSheet, View, type StyleProp } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors } from '@/theme';

/**
 * Photo de réalisation servie par une URL signée temporaire (bucket privé).
 * - Clé de cache = chemin Storage : l'image déjà téléchargée n'est pas rechargée quand l'URL
 *   signée est renouvelée.
 * - Échec de chargement (URL expirée, accès retiré) : demande un renouvellement, une seule fois
 *   par URL, puis affiche un emplacement neutre.
 */
export function PortfolioImage({
  url,
  path,
  style,
  onExpired,
}: {
  url: string | null;
  path: string | null;
  style?: StyleProp<ImageStyle>;
  onExpired?: () => void;
}) {
  const reported = useRef<string | null>(null);

  if (!url || !path) {
    return (
      <View style={[styles.placeholder, style]}>
        <Icon name="image-outline" size={24} color="textDisabled" />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: url, cacheKey: path }}
      style={[styles.image, style]}
      contentFit="cover"
      transition={150}
      recyclingKey={path}
      accessible={false}
      onError={() => {
        if (reported.current === url) return;
        reported.current = url;
        onExpired?.();
      }}
    />
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.skeleton },
  placeholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
