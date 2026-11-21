import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { validatePickedImages, type PickedImage } from '@/features/media/validateImages';
import { colors, radius, spacing } from '@/theme';

import { Field } from './Field';

export type ImageUploaderProps = {
  value: readonly PickedImage[];
  onChange: (images: PickedImage[]) => void;
  max?: number;
  /** Poids maximal par photo avant compression (Mo). */
  maxSizeMb?: number;
  label?: string;
  helper?: string;
  error?: string;
  optional?: boolean;
};

/**
 * Sélection de photos depuis la galerie (sélecteur système : aucune permission requise
 * sur Android 13+ et iOS 14+). La compression et l'envoi vers Supabase Storage
 * sont réalisés par les écrans métier (KHD-008, KHD-010).
 */
export function ImageUploader({
  value,
  onChange,
  max = 5,
  maxSizeMb = 10,
  label,
  helper,
  error,
  optional,
}: ImageUploaderProps) {
  const { t } = useTranslation();
  const [pickError, setPickError] = useState<string | null>(null);
  const remaining = max - value.length;

  const pick = async () => {
    setPickError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: remaining > 1,
        selectionLimit: remaining,
        quality: 0.8,
        exif: false,
      });
      if (result.canceled) return;

      const { accepted, rejected } = validatePickedImages(
        result.assets.map((asset) => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
        })),
        { remainingSlots: remaining, maxBytes: maxSizeMb * 1024 * 1024 },
      );

      if (rejected.invalidType > 0) setPickError(t('imageUploader.invalidType'));
      else if (rejected.tooLarge > 0)
        setPickError(t('imageUploader.tooLarge', { size: maxSizeMb }));
      else if (rejected.overLimit > 0) setPickError(t('imageUploader.limitReached', { max }));

      if (accepted.length > 0) onChange([...value, ...accepted]);
    } catch {
      setPickError(t('imageUploader.pickerError'));
    }
  };

  return (
    <Field
      label={label}
      optional={optional}
      error={error ?? pickError ?? undefined}
      helper={helper ?? t('imageUploader.count', { count: value.length, max })}
    >
      <View style={styles.grid}>
        {value.map((image, index) => (
          <View key={image.uri} style={styles.tile}>
            <Image
              source={{ uri: image.uri }}
              style={styles.image}
              contentFit="cover"
              accessible
              accessibilityLabel={t('imageUploader.photoA11y', { index: index + 1 })}
            />
            <IconButton
              icon="close"
              size="sm"
              variant="surface"
              accessibilityLabel={t('imageUploader.remove', { index: index + 1 })}
              onPress={() => onChange(value.filter((_, i) => i !== index))}
              style={styles.remove}
            />
          </View>
        ))}
        {remaining > 0 ? (
          <Pressable
            onPress={pick}
            accessibilityRole="button"
            accessibilityLabel={t('imageUploader.add')}
            style={({ pressed }) => [styles.tile, styles.addTile, pressed && styles.addTilePressed]}
          >
            <Icon name="images-outline" size={26} color="primary" />
            <Text variant="caption" color="primary" align="center" numberOfLines={2}>
              {t('imageUploader.add')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.skeleton,
  },
  image: { width: '100%', height: '100%' },
  remove: { position: 'absolute', top: spacing.xs, end: spacing.xs },
  addTile: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  addTilePressed: { opacity: 0.7 },
});
