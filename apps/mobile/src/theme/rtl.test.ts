import { describe, expect, it } from 'vitest';

import { resolveTextAlign } from './rtl';
import { containsArabic, textStyleFor } from './typography';

describe('resolveTextAlign', () => {
  it('Android : le natif inverse déjà left/right en RTL', () => {
    expect(resolveTextAlign('start', 'android', true)).toBe('left');
    expect(resolveTextAlign('end', 'android', true)).toBe('right');
  });

  it('iOS : inversion manuelle en RTL', () => {
    expect(resolveTextAlign('start', 'ios', true)).toBe('right');
    expect(resolveTextAlign('end', 'ios', true)).toBe('left');
    expect(resolveTextAlign('start', 'ios', false)).toBe('left');
  });

  it('Web : valeurs logiques', () => {
    expect(resolveTextAlign('start', 'web', true)).toBe('start');
  });

  it('center reste center', () => {
    expect(resolveTextAlign('center', 'ios', true)).toBe('center');
  });
});

describe('typographie', () => {
  it('choisit la police selon le script', () => {
    expect(textStyleFor('body', 'latin').fontFamily).toBe('Inter_400Regular');
    expect(textStyleFor('h1', 'arabic').fontFamily).toBe('NotoSansArabic_700Bold');
  });

  it("l'arabe a un interligne plus grand", () => {
    const latin = textStyleFor('body', 'latin').lineHeight ?? 0;
    const arabic = textStyleFor('body', 'arabic').lineHeight ?? 0;
    expect(arabic).toBeGreaterThan(latin);
  });

  it('détecte les caractères arabes', () => {
    expect(containsArabic('خدمة ديزاد')).toBe(true);
    expect(containsArabic('Khedma DZ')).toBe(false);
    expect(containsArabic('Karim — كريم')).toBe(true);
  });
});
