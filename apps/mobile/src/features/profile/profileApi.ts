/**
 * Accès aux données de profil (Supabase). Toutes les requêtes passent par la RLS existante :
 * chaque utilisateur ne lit / modifie que ses propres lignes et colonnes autorisées.
 */
import type { Locale } from '@khedma/types';
import type { ProfileUpdateValues } from '@khedma/validation';

import { listMyPortfolioFiles, removePortfolioFiles } from '@/features/artisan/proProfileApi';
import { supabase } from '@/services/supabase';

import { AvatarImageError, checkAvatarBytes, toArrayBuffer } from './avatarImage';
import { buildAvatarPath, isOwnAvatarPath } from './profileErrors';

export type Wilaya = { id: number; code: string; nameFr: string; nameAr: string };
export type Commune = { id: number; wilayaId: number; nameFr: string; nameAr: string };

export type MyProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  phone: string | null;
  phoneVerified: boolean;
  locale: Locale;
  commune: Commune | null;
  wilaya: Wilaya | null;
};

const AVATAR_BUCKET = 'avatars';

export function avatarPublicUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function fetchMyProfile(userId: string, email: string): Promise<MyProfile> {
  const [publicPart, privatePart] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_path')
      .eq('id', userId)
      .single(),
    supabase
      .from('profile_private')
      .select(
        'phone, phone_verified_at, locale, commune:communes(id, wilaya_id, name_fr, name_ar, wilaya:wilayas(id, code, name_fr, name_ar))',
      )
      .eq('user_id', userId)
      .single(),
  ]);
  if (publicPart.error) throw publicPart.error;
  if (privatePart.error) throw privatePart.error;

  const p = publicPart.data;
  const priv = privatePart.data;
  const commune = priv.commune;
  return {
    id: p.id,
    email,
    firstName: p.first_name,
    lastName: p.last_name,
    avatarPath: p.avatar_path,
    avatarUrl: avatarPublicUrl(p.avatar_path),
    phone: priv.phone,
    phoneVerified: priv.phone_verified_at !== null,
    locale: priv.locale,
    commune: commune
      ? {
          id: commune.id,
          wilayaId: commune.wilaya_id,
          nameFr: commune.name_fr,
          nameAr: commune.name_ar,
        }
      : null,
    wilaya: commune?.wilaya
      ? {
          id: commune.wilaya.id,
          code: commune.wilaya.code,
          nameFr: commune.wilaya.name_fr,
          nameAr: commune.wilaya.name_ar,
        }
      : null,
  };
}

export async function fetchWilayas(): Promise<Wilaya[]> {
  const { data, error } = await supabase
    .from('wilayas')
    .select('id, code, name_fr, name_ar')
    .order('code');
  if (error) throw error;
  return data.map((w) => ({ id: w.id, code: w.code, nameFr: w.name_fr, nameAr: w.name_ar }));
}

/** Communes d'une wilaya, chargées à la demande (jamais l'ensemble du territoire d'un coup). */
export async function fetchCommunes(wilayaId: number): Promise<Commune[]> {
  const { data, error } = await supabase
    .from('communes')
    .select('id, wilaya_id, name_fr, name_ar')
    .eq('wilaya_id', wilayaId)
    .order('name_fr');
  if (error) throw error;
  return data.map((c) => ({
    id: c.id,
    wilayaId: c.wilaya_id,
    nameFr: c.name_fr,
    nameAr: c.name_ar,
  }));
}

export async function updateMyProfile(userId: string, values: ProfileUpdateValues): Promise<void> {
  const names = await supabase
    .from('profiles')
    .update({ first_name: values.firstName, last_name: values.lastName })
    .eq('id', userId);
  if (names.error) throw names.error;
  const priv = await supabase
    .from('profile_private')
    .update({ phone: values.phone, commune_id: values.communeId })
    .eq('user_id', userId);
  if (priv.error) throw priv.error;
}

/** Langue préférée (notifications et e-mails futurs). Silencieux en cas d'échec : la langue locale reste appliquée. */
export async function syncMyLocale(locale: Locale): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) return;
  await supabase.from('profile_private').update({ locale }).eq('user_id', userId);
}

/**
 * Remplace la photo de profil : envoi des octets JPEG déjà vérifiés, mise à jour du profil,
 * puis suppression de l'ancienne. En cas d'échec de mise à jour, le nouveau fichier est retiré.
 * Les octets sont revérifiés ici : aucun contenu qui ne soit pas un JPEG n'est envoyé.
 */
export async function replaceAvatar(
  userId: string,
  previousPath: string | null,
  bytes: Uint8Array,
): Promise<string> {
  const problem = checkAvatarBytes(bytes);
  if (problem) throw new AvatarImageError(problem);
  const path = buildAvatarPath(userId, Date.now());

  const upload = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, toArrayBuffer(bytes), { contentType: 'image/jpeg', upsert: false });
  if (upload.error) throw upload.error;

  const update = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (update.error) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    throw update.error;
  }
  if (isOwnAvatarPath(userId, previousPath)) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }
  return path;
}

export async function removeAvatar(userId: string, currentPath: string | null): Promise<void> {
  const update = await supabase.from('profiles').update({ avatar_path: null }).eq('id', userId);
  if (update.error) throw update.error;
  if (isOwnAvatarPath(userId, currentPath)) {
    await supabase.storage.from(AVATAR_BUCKET).remove([currentPath]);
  }
}

/**
 * Changement de mot de passe : le mot de passe actuel est revérifié (connexion),
 * ce qui satisfait aussi l'exigence « connexion récente » de Supabase (Secure password change).
 */
export async function changeMyPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
) {
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (check.error) throw check.error;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Suppression définitive. Les fichiers (photo de profil, galerie) sont listés d'abord, mais
 * supprimés seulement APRÈS la suppression du compte : si celle-ci est refusée (prestation en
 * cours), aucune photo n'est perdue. Le jeton encore valide autorise ce nettoyage de son dossier.
 */
export async function deleteMyAccount(userId: string, beforeSignOut?: () => void): Promise<void> {
  const avatars = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
  const avatarPaths = (avatars.data ?? []).map((f) => `${userId}/${f.name}`);
  const portfolioPaths = await listMyPortfolioFiles(userId);

  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;

  // Nettoyage au mieux : un fichier restant serait orphelin et inaccessible depuis l'application.
  await Promise.allSettled([
    avatarPaths.length ? supabase.storage.from(AVATAR_BUCKET).remove(avatarPaths) : null,
    removePortfolioFiles(portfolioPaths),
  ]);
  // Le compte n'existe plus : la déconnexion locale qui suit est attendue (pas « session expirée »).
  beforeSignOut?.();
  await supabase.auth.signOut({ scope: 'local' });
}
