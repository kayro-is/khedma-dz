/**
 * Profil artisan professionnel (Supabase). Tout passe par la RLS et les contrôles serveur :
 * - l'artisan ne lit et ne modifie que ses propres lignes ;
 * - publication, métiers, zones et galerie sont vérifiés par les triggers (KHD-008) ;
 * - le téléphone professionnel n'est lisible que par lui (get_my_professional_phone) ;
 * - verification_status n'est jamais envoyé (colonne non modifiable).
 */
import type {
  ArtisanAvailability,
  ArtisanProfileValues,
  ArtisanTradesValues,
} from '@khedma/validation';

import { AvatarImageError, checkJpegBytes, toArrayBuffer } from '@/features/profile/avatarImage';
import { supabase } from '@/services/supabase';

import {
  buildPortfolioPath,
  isOwnPortfolioPath,
  planTradeChanges,
  planZoneChanges,
} from './proProfileLogic';

const PORTFOLIO_BUCKET = 'portfolio';
/** Limite du bucket « portfolio » (5 Mo). */
export const PORTFOLIO_MAX_BYTES = 5 * 1024 * 1024;
/** Durée de vie des URL signées des photos de réalisation : 10 minutes. */
export const PORTFOLIO_SIGNED_URL_TTL_SECONDS = 600;

type Named = { nameFr: string; nameAr: string };
type WilayaRef = Named & { id: number; code: string };

export type ProZone = Named & { communeId: number; wilaya: WilayaRef | null };
export type ProService = Named & { categoryId: string; slug: string };
export type ProPortfolioItem = {
  id: string;
  caption: string | null;
  sortOrder: number;
  /** Chemin Storage (stable) : sert aussi de clé de cache de l'image sur l'appareil. */
  imagePath: string | null;
  /** URL signée temporaire (jamais enregistrée en base), null si l'accès est refusé. */
  imageUrl: string | null;
};

export type ProProfile = {
  businessName: string;
  description: string | null;
  yearsExperience: number | null;
  availability: ArtisanAvailability;
  isPublished: boolean;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  ratingAvg: number | null;
  reviewCount: number;
  primaryCategoryId: string;
  baseCommune: (Named & { id: number; wilaya: WilayaRef | null }) | null;
  professionalPhone: string | null;
  services: ProService[];
  zones: ProZone[];
  portfolio: ProPortfolioItem[];
};

const named = (row: { name_fr: string; name_ar: string }): Named => ({
  nameFr: row.name_fr,
  nameAr: row.name_ar,
});
const wilayaRef = (
  w: { id: number; code: string; name_fr: string; name_ar: string } | null,
): WilayaRef | null => (w ? { id: w.id, code: w.code, ...named(w) } : null);

/**
 * Accès aux photos de réalisation (bucket PRIVÉ, KHD-008-SEC) : URL signées de courte durée,
 * demandées en un seul appel. Supabase ne les délivre qu'aux utilisateurs autorisés (l'artisan
 * lui-même, ou tout utilisateur connecté si le profil est publié). Elles ne sont jamais
 * enregistrées en base : l'application les renouvelle avant expiration (voir signedUrlRefresh).
 * Une URL déjà délivrée reste valable jusqu'à son expiration, même après une dépublication.
 */
export async function signPortfolioPaths(paths: readonly string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .createSignedUrls([...paths], PORTFOLIO_SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const urls = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl && !entry.error) urls.set(entry.path, entry.signedUrl);
  }
  return urls;
}

export async function fetchProProfile(userId: string): Promise<ProProfile | null> {
  const [profile, phone, services, zones, portfolio] = await Promise.all([
    supabase
      .from('artisan_profiles')
      .select(
        'business_name, description, years_experience, availability, is_published, verification_status, rating_avg, review_count, primary_category_id, base_commune:communes!artisan_profiles_base_commune_id_fkey(id, name_fr, name_ar, wilaya:wilayas(id, code, name_fr, name_ar))',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.rpc('get_my_professional_phone'),
    supabase
      .from('artisan_services')
      .select('category_id, category:categories(slug, name_fr, name_ar)')
      .eq('artisan_id', userId),
    supabase
      .from('artisan_service_areas')
      .select(
        'commune_id, commune:communes(name_fr, name_ar, wilaya:wilayas(id, code, name_fr, name_ar))',
      )
      .eq('artisan_id', userId),
    supabase
      .from('portfolio_items')
      .select(
        'id, title, sort_order, created_at, images:portfolio_images(storage_path, sort_order)',
      )
      .eq('artisan_id', userId)
      .order('sort_order')
      .order('created_at'),
  ]);
  for (const result of [profile, phone, services, zones, portfolio]) {
    if (result.error) throw result.error;
  }
  const p = profile.data;
  if (!p) return null;

  const items = (portfolio.data ?? []).map((item) => {
    const image = [...(item.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
    return {
      id: item.id,
      caption: item.title,
      sortOrder: item.sort_order,
      imagePath: image?.storage_path ?? null,
    };
  });
  const signed = await signPortfolioPaths(
    items.map((item) => item.imagePath).filter((path): path is string => path !== null),
  );

  return {
    businessName: p.business_name,
    description: p.description,
    yearsExperience: p.years_experience,
    availability: p.availability,
    isPublished: p.is_published,
    verificationStatus: p.verification_status,
    ratingAvg: p.rating_avg,
    reviewCount: p.review_count,
    primaryCategoryId: p.primary_category_id,
    baseCommune: p.base_commune
      ? {
          id: p.base_commune.id,
          ...named(p.base_commune),
          wilaya: wilayaRef(p.base_commune.wilaya),
        }
      : null,
    professionalPhone: phone.data ?? null,
    services: (services.data ?? []).map((s) => ({
      categoryId: s.category_id,
      slug: s.category?.slug ?? '',
      nameFr: s.category?.name_fr ?? '',
      nameAr: s.category?.name_ar ?? '',
    })),
    zones: (zones.data ?? []).map((z) => ({
      communeId: z.commune_id,
      nameFr: z.commune?.name_fr ?? '',
      nameAr: z.commune?.name_ar ?? '',
      wilaya: wilayaRef(z.commune?.wilaya ?? null),
    })),
    portfolio: items.map((item) => ({
      ...item,
      imageUrl: item.imagePath ? (signed.get(item.imagePath) ?? null) : null,
    })),
  };
}

/** Informations professionnelles. La commune de rattachement est toujours une zone d'intervention. */
export async function updateProInfo(userId: string, values: ArtisanProfileValues): Promise<void> {
  const { error } = await supabase
    .from('artisan_profiles')
    .update({
      business_name: values.businessName,
      description: values.description,
      years_experience: values.yearsExperience,
      availability: values.availability,
      base_commune_id: values.communeId,
      professional_phone: values.professionalPhone,
    })
    .eq('user_id', userId);
  if (error) throw error;
  const zone = await supabase
    .from('artisan_service_areas')
    .upsert(
      { artisan_id: userId, commune_id: values.communeId },
      { onConflict: 'artisan_id,commune_id', ignoreDuplicates: true },
    );
  if (zone.error) throw zone.error;
}

export async function saveTrades(
  userId: string,
  current: { primaryCategoryId: string; serviceIds: readonly string[] },
  values: ArtisanTradesValues,
): Promise<void> {
  const plan = planTradeChanges(current, values);
  if (plan.primaryChanged) {
    const { error } = await supabase
      .from('artisan_profiles')
      .update({ primary_category_id: values.primaryCategoryId })
      .eq('user_id', userId);
    if (error) throw error;
  }
  if (plan.delete.length) {
    const { error } = await supabase
      .from('artisan_services')
      .delete()
      .eq('artisan_id', userId)
      .in('category_id', plan.delete);
    if (error) throw error;
  }
  if (plan.insert.length) {
    const { error } = await supabase
      .from('artisan_services')
      .insert(plan.insert.map((categoryId) => ({ artisan_id: userId, category_id: categoryId })));
    if (error) throw error;
  }
}

export async function saveZones(
  userId: string,
  currentIds: readonly number[],
  nextIds: readonly number[],
): Promise<void> {
  for (const step of planZoneChanges(currentIds, nextIds).steps) {
    const { error } =
      step.kind === 'insert'
        ? await supabase
            .from('artisan_service_areas')
            .insert(step.ids.map((communeId) => ({ artisan_id: userId, commune_id: communeId })))
        : await supabase
            .from('artisan_service_areas')
            .delete()
            .eq('artisan_id', userId)
            .in('commune_id', step.ids);
    if (error) throw error;
  }
}

export async function setPublished(userId: string, published: boolean): Promise<void> {
  const { error } = await supabase
    .from('artisan_profiles')
    .update({ is_published: published })
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Ajoute une réalisation (1 photo + légende facultative). Ordre sûr : la réalisation est créée,
 * la photo envoyée puis rattachée ; en cas d'échec, tout ce qui a été créé est retiré.
 * Aucun fichier existant n'est jamais supprimé ici.
 */
export async function addPortfolioPhoto(
  userId: string,
  photo: { bytes: Uint8Array; caption: string | null },
  sortOrder: number,
): Promise<void> {
  const problem = checkJpegBytes(photo.bytes, PORTFOLIO_MAX_BYTES);
  if (problem) throw new AvatarImageError(problem);

  const created = await supabase
    .from('portfolio_items')
    .insert({ artisan_id: userId, title: photo.caption, sort_order: sortOrder })
    .select('id')
    .single();
  if (created.error) throw created.error;
  const itemId = created.data.id;
  const path = buildPortfolioPath(userId, itemId, Date.now());

  const upload = await supabase.storage
    .from(PORTFOLIO_BUCKET)
    .upload(path, toArrayBuffer(photo.bytes), { contentType: 'image/jpeg', upsert: false });
  if (upload.error) {
    await supabase.from('portfolio_items').delete().eq('id', itemId);
    throw upload.error;
  }
  const image = await supabase
    .from('portfolio_images')
    .insert({ item_id: itemId, storage_path: path, sort_order: 0 });
  if (image.error) {
    await supabase.from('portfolio_items').delete().eq('id', itemId);
    await supabase.storage.from(PORTFOLIO_BUCKET).remove([path]);
    throw image.error;
  }
}

export async function updatePortfolioCaption(itemId: string, caption: string | null) {
  const { error } = await supabase
    .from('portfolio_items')
    .update({ title: caption })
    .eq('id', itemId);
  if (error) throw error;
}

/** Suppression : la réalisation d'abord (données), le fichier ensuite (un fichier orphelin est sans risque). */
export async function deletePortfolioItem(userId: string, item: ProPortfolioItem): Promise<void> {
  const { error } = await supabase.from('portfolio_items').delete().eq('id', item.id);
  if (error) throw error;
  if (isOwnPortfolioPath(userId, item.imagePath)) {
    await supabase.storage.from(PORTFOLIO_BUCKET).remove([item.imagePath]);
  }
}

export async function reorderPortfolio(itemIds: readonly string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_my_portfolio', { p_item_ids: [...itemIds] });
  if (error) throw error;
}

/** Fichiers de la galerie d'un utilisateur (suppression de compte). */
export async function listMyPortfolioFiles(userId: string): Promise<string[]> {
  const folders = await supabase.storage.from(PORTFOLIO_BUCKET).list(userId, { limit: 100 });
  if (folders.error || !folders.data) return [];
  const paths: string[] = [];
  for (const folder of folders.data) {
    const files = await supabase.storage
      .from(PORTFOLIO_BUCKET)
      .list(`${userId}/${folder.name}`, { limit: 20 });
    for (const file of files.data ?? []) paths.push(`${userId}/${folder.name}/${file.name}`);
  }
  return paths;
}

export async function removePortfolioFiles(paths: string[]): Promise<void> {
  if (paths.length) await supabase.storage.from(PORTFOLIO_BUCKET).remove(paths);
}
