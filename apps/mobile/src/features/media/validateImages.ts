/**
 * Contrôle côté client des photos sélectionnées (format, poids, nombre).
 * Le contrôle définitif est refait côté serveur (politiques Storage, KHD-003).
 */
export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
  mimeType?: string;
  fileName?: string | null;
};

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

const EXTENSION_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

function resolveMimeType(image: PickedImage): string | null {
  if (image.mimeType) return image.mimeType.toLowerCase();
  const source = image.fileName ?? image.uri;
  const extension = source.split('?')[0]?.split('.').pop()?.toLowerCase();
  return extension ? (EXTENSION_TO_MIME[extension] ?? null) : null;
}

export type ImageValidationResult = {
  accepted: PickedImage[];
  rejected: { invalidType: number; tooLarge: number; overLimit: number };
};

export function validatePickedImages(
  candidates: readonly PickedImage[],
  options: { remainingSlots: number; maxBytes: number },
): ImageValidationResult {
  const accepted: PickedImage[] = [];
  const rejected = { invalidType: 0, tooLarge: 0, overLimit: 0 };

  for (const image of candidates) {
    const mime = resolveMimeType(image);
    if (!mime || !(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime)) {
      rejected.invalidType += 1;
    } else if (image.fileSize !== undefined && image.fileSize > options.maxBytes) {
      rejected.tooLarge += 1;
    } else if (accepted.length >= options.remainingSlots) {
      rejected.overLimit += 1;
    } else {
      accepted.push(image);
    }
  }
  return { accepted, rejected };
}
