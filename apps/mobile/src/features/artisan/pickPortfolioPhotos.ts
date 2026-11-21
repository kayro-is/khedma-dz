import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { AvatarImageError, base64ToBytes, checkJpegBytes } from '@/features/profile/avatarImage';

import { PORTFOLIO_MAX_BYTES } from './proProfileApi';
import { fitWithin, PORTFOLIO_MAX_SIDE } from './proProfileLogic';

export type PreparedPhoto = { key: string; uri: string; bytes: Uint8Array };

/**
 * Sélection de plusieurs photos (sélecteur système Android : aucune permission, URI content://
 * prises en charge), puis redimensionnement et compression JPEG de chacune. Même méthode fiable
 * que la photo de profil : les octets viennent directement de la compression (Base64), jamais
 * d'une relecture du fichier, et sont vérifiés avant tout envoi.
 * @param limit nombre maximal de photos encore autorisées dans la galerie.
 */
export async function pickPortfolioPhotos(limit: number): Promise<PreparedPhoto[]> {
  if (limit <= 0) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    orderedSelection: true,
    quality: 1,
    exif: false,
  });
  if (result.canceled) return [];

  const prepared: PreparedPhoto[] = [];
  for (const [index, asset] of result.assets.slice(0, limit).entries()) {
    const size = fitWithin(asset.width || PORTFOLIO_MAX_SIDE, asset.height || PORTFOLIO_MAX_SIDE);
    const rendered = await ImageManipulator.manipulate(asset.uri).resize(size).renderAsync();
    // Réencodage : supprime toute métadonnée (EXIF, position GPS).
    const saved = await rendered.saveAsync({
      compress: 0.8,
      format: SaveFormat.JPEG,
      base64: true,
    });
    if (!saved.base64) throw new AvatarImageError('unreadable');
    const bytes = base64ToBytes(saved.base64);
    const problem = checkJpegBytes(bytes, PORTFOLIO_MAX_BYTES);
    if (problem) throw new AvatarImageError(problem);
    prepared.push({ key: `${Date.now()}-${index}`, uri: saved.uri, bytes });
  }
  return prepared;
}
