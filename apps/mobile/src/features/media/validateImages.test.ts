import { describe, expect, it } from 'vitest';

import { validatePickedImages, type PickedImage } from './validateImages';

const MB = 1024 * 1024;
const img = (overrides: Partial<PickedImage> = {}): PickedImage => ({
  uri: 'file:///photo.jpg',
  width: 1200,
  height: 900,
  fileSize: 2 * MB,
  mimeType: 'image/jpeg',
  ...overrides,
});

describe('validatePickedImages', () => {
  const options = { remainingSlots: 5, maxBytes: 10 * MB };

  it('accepte les formats autorisés', () => {
    const result = validatePickedImages(
      [img(), img({ mimeType: 'image/png' }), img({ mimeType: 'image/HEIC' })],
      options,
    );
    expect(result.accepted).toHaveLength(3);
  });

  it('rejette les formats non autorisés (gif, pdf, vidéo)', () => {
    const result = validatePickedImages(
      [
        img({ mimeType: 'image/gif' }),
        img({ mimeType: 'application/pdf' }),
        img({ mimeType: 'video/mp4' }),
      ],
      options,
    );
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected.invalidType).toBe(3);
  });

  it("déduit le type depuis l'extension si le mimeType est absent", () => {
    const result = validatePickedImages(
      [
        img({ mimeType: undefined, uri: 'file:///a.webp' }),
        img({ mimeType: undefined, fileName: 'b.exe' }),
        img({ mimeType: undefined, uri: 'file:///sans-extension' }),
      ],
      options,
    );
    expect(result.accepted).toHaveLength(1);
    expect(result.rejected.invalidType).toBe(2);
  });

  it('rejette les fichiers trop lourds', () => {
    const result = validatePickedImages([img({ fileSize: 11 * MB })], options);
    expect(result.rejected.tooLarge).toBe(1);
  });

  it('respecte le nombre de places restantes', () => {
    const result = validatePickedImages([img(), img(), img()], { ...options, remainingSlots: 2 });
    expect(result.accepted).toHaveLength(2);
    expect(result.rejected.overLimit).toBe(1);
  });
});
