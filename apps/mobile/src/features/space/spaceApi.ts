/**
 * Rôles et profil artisan (Supabase). Toutes les requêtes passent par la RLS existante :
 * - user_roles : lecture de ses propres rôles uniquement, aucune écriture possible ;
 * - artisan_profiles : création de SON profil uniquement, compte actif, colonnes autorisées.
 *   Le rôle ARTISAN est attribué par le trigger serveur on_artisan_profile_created.
 */
import type { ArtisanActivationValues } from '@khedma/validation';

import { supabase } from '@/services/supabase';

import { isAlreadyArtisanError } from './spaceErrors';

export type MyRoles = { isParticulier: boolean; isArtisan: boolean };

export async function fetchMyRoles(userId: string): Promise<MyRoles> {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
  if (error) throw error;
  const roles = new Set(data.map((r) => r.role));
  return { isParticulier: roles.has('PARTICULIER'), isArtisan: roles.has('ARTISAN') };
}

type Named = { nameFr: string; nameAr: string };

export type MyArtisanProfile = {
  businessName: string;
  yearsExperience: number | null;
  isPublished: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  category: (Named & { slug: string }) | null;
  commune: (Named & { wilaya: (Named & { code: string }) | null }) | null;
};

export async function fetchMyArtisanProfile(userId: string): Promise<MyArtisanProfile | null> {
  const { data, error } = await supabase
    .from('artisan_profiles')
    .select(
      'business_name, years_experience, is_published, verification_status, category:categories!artisan_profiles_primary_category_id_fkey(slug, name_fr, name_ar), commune:communes!artisan_profiles_base_commune_id_fkey(name_fr, name_ar, wilaya:wilayas(code, name_fr, name_ar))',
    )
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    businessName: data.business_name,
    yearsExperience: data.years_experience,
    isPublished: data.is_published,
    verificationStatus: data.verification_status,
    category: data.category
      ? { slug: data.category.slug, nameFr: data.category.name_fr, nameAr: data.category.name_ar }
      : null,
    commune: data.commune
      ? {
          nameFr: data.commune.name_fr,
          nameAr: data.commune.name_ar,
          wilaya: data.commune.wilaya
            ? {
                code: data.commune.wilaya.code,
                nameFr: data.commune.wilaya.name_fr,
                nameAr: data.commune.wilaya.name_ar,
              }
            : null,
        }
      : null,
  };
}

/**
 * Active l'espace Artisan sur le compte existant (aucun second compte).
 * Le profil est créé NON PUBLIÉ : invisible des clients jusqu'à sa complétion (KHD-008).
 * Un profil déjà existant (double appui, autre appareil) est considéré comme une activation réussie.
 */
export async function activateArtisanSpace(
  userId: string,
  values: ArtisanActivationValues,
): Promise<void> {
  const { error } = await supabase.from('artisan_profiles').insert({
    user_id: userId,
    business_name: values.businessName,
    primary_category_id: values.categoryId,
    base_commune_id: values.communeId,
    years_experience: values.yearsExperience,
    is_published: false,
  });
  if (error && !isAlreadyArtisanError(error)) throw error;
}
