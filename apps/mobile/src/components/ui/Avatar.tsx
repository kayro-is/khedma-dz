import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { initials } from '@/lib/format';
import { colors } from '@/theme';

import { Icon } from './Icon';
import { Text } from './Text';

export type AvatarProps = {
  name: string;
  uri?: string | null;
  size?: number;
  /** Pastille de vérification (uniquement si la vérification a été réalisée). */
  verified?: boolean;
};

export function Avatar({ name, uri, size = 48, verified = false }: AvatarProps) {
  const badgeSize = Math.max(16, Math.round(size * 0.34));
  // Image illisible (fichier absent ou corrompu, réseau) : initiales plutôt qu'un cercle vide.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = !!uri && uri !== failedUri;
  return (
    <View
      style={{ width: size, height: size }}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {showImage ? (
        <Image
          source={{ uri }}
          onError={() => setFailedUri(uri)}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={150}
          recyclingKey={uri}
        />
      ) : (
        <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text
            variant={size >= 56 ? 'h2' : 'bodyStrong'}
            color="primaryDark"
            align="center"
            allowFontScaling={false}
          >
            {initials(name)}
          </Text>
        </View>
      )}
      {verified ? (
        <View
          style={[
            styles.verified,
            { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
          ]}
        >
          <Icon name="checkmark" size={badgeSize * 0.7} color="onPrimary" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.skeleton },
  fallback: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verified: {
    position: 'absolute',
    bottom: 0,
    end: 0,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
