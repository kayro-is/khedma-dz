/**
 * Résolution de l'alignement de texte « logique » (début / fin) vers les valeurs
 * attendues par chaque plateforme. Logique pure, testée unitairement.
 *
 * - Android (RN 0.88) : `left` / `right` sont déjà inversés en RTL par le moteur natif.
 * - iOS : `left` / `right` sont absolus, il faut les inverser nous-mêmes.
 * - Web : `start` / `end` sont résolus par le navigateur selon `dir`.
 */
export type LogicalTextAlign = 'start' | 'center' | 'end';
export type PhysicalTextAlign = 'left' | 'right' | 'center' | 'auto';
type Os = 'android' | 'ios' | 'web' | 'windows' | 'macos';

export function resolveTextAlign(
  align: LogicalTextAlign,
  os: Os,
  isRTL: boolean,
): PhysicalTextAlign | 'start' | 'end' {
  if (align === 'center') return 'center';
  if (os === 'web') return align;
  const atStart = align === 'start';
  if (os === 'android') return atStart ? 'left' : 'right';
  if (isRTL) return atStart ? 'right' : 'left';
  return atStart ? 'left' : 'right';
}
