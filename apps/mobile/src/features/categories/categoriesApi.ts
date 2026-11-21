/** Métiers actifs (référentiel administrable, lecture publique), dans l'ordre défini par l'administration. */
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/services/supabase';

export type Category = { id: string; slug: string; nameFr: string; nameAr: string };

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, slug, name_fr, name_ar')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data.map((c) => ({ id: c.id, slug: c.slug, nameFr: c.name_fr, nameAr: c.name_ar }));
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    staleTime: 6 * 60 * 60 * 1000,
  });
}
