import type { IconName } from '@/components/ui/Icon';

/**
 * Icône par identifiant (slug) de catégorie. Les libellés fr / ar et la liste active
 * des catégories viennent de la base de données (administrables).
 */
const CATEGORY_ICONS: Record<string, IconName> = {
  plomberie: 'water-outline',
  electricite: 'flash-outline',
  climatisation: 'snow-outline',
  peinture: 'color-palette-outline',
  menuiserie: 'hammer-outline',
  maconnerie: 'business-outline',
  jardinage: 'leaf-outline',
  nettoyage: 'sparkles-outline',
  mecanique: 'car-outline',
  serrurerie: 'key-outline',
  electromenager: 'tv-outline',
  renovation: 'construct-outline',
};

export function categoryIcon(slug: string): IconName {
  return CATEGORY_ICONS[slug] ?? 'briefcase-outline';
}
