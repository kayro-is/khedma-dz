import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { AvatarImageError, base64ToBytes, checkAvatarBytes } from './avatarImage';

/** Taille finale de l'avatar : suffisante pour un affichage net en 3× (≈ 170 pt). */
export const AVATAR_SIZE = 512;

export type PreparedAvatar = {
  /** Fichier local compressé (aperçu immédiat). */
  uri: string;
  /** Octets JPEG vérifiés, prêts à être envoyés. */
  bytes: Uint8Array;
};

/**
 * Choix d'une photo dans la galerie (sélecteur système : aucune permission requise, y compris
 * avec les URI content:// d'Android), recadrage carré, redimensionnement et compression JPEG.
 * Les octets sont lus directement depuis le résultat de la compression (Base64), sans relire le
 * fichier, puis vérifiés. Renvoie null si l'utilisateur annule.
 */
export async function pickAndCompressAvatar(): Promise<PreparedAvatar | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
    exif: false,
  });
  if (result.canceled || !result.assets[0]) return null;

  const rendered = await ImageManipulator.manipulate(result.assets[0].uri)
    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE })
    .renderAsync();
  // Réencodage : supprime aussi toute métadonnée (EXIF, position GPS) de la photo d'origine.
  const saved = await rendered.saveAsync({ compress: 0.8, format: SaveFormat.JPEG, base64: true });
  if (!saved.base64) throw new AvatarImageError('unreadable');

  const bytes = base64ToBytes(saved.base64);
  const problem = checkAvatarBytes(bytes);
  if (problem) throw new AvatarImageError(problem);
  return { uri: saved.uri, bytes };
}
