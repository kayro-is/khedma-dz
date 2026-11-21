/**
 * KHD-004 — Authentification contre le projet Supabase de TEST, via les vraies API.
 * Aucun compte n'est créé et aucun e-mail n'est envoyé : les inscriptions testées sont refusées
 * par Supabase AVANT la création du compte (mot de passe non conforme).
 */
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { Database } from '@khedma/types';
import { signUpSchema } from '@khedma/validation';

const url = process.env.SUPABASE_URL as string;
const anonKey = process.env.SUPABASE_ANON_KEY as string;
if (!url || !anonKey) throw new Error('Lancer via « pnpm cloud test integration ».');

const client = () =>
  createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, flowType: 'pkce' },
  });

describe('connexion', () => {
  it('ouvre une session avec jetons d’accès et de renouvellement', async () => {
    const supabase = client();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'amina@khedma.test',
      password: 'Khedma2026!',
    });
    expect(error).toBeNull();
    expect(data.session?.access_token).toBeTruthy();
    expect(data.session?.refresh_token).toBeTruthy();
    expect(data.session?.expires_at).toBeGreaterThan(Date.now() / 1000);
    expect(data.user?.user_metadata).toMatchObject({ first_name: 'Amina', locale: 'fr' });
  });

  it('refuse un mauvais mot de passe avec un code exploitable (invalid_credentials)', async () => {
    const { error } = await client().auth.signInWithPassword({
      email: 'amina@khedma.test',
      password: 'MauvaisMotDePasse1',
    });
    expect(error?.code).toBe('invalid_credentials');
  });

  it('ne distingue pas un compte inexistant d’un mauvais mot de passe (pas d’énumération)', async () => {
    const { error } = await client().auth.signInWithPassword({
      email: 'personne-inexistante@khedma.test',
      password: 'Khedma2026!',
    });
    expect(error?.code).toBe('invalid_credentials');
  });
});

describe('renouvellement et fin de session', () => {
  it('renouvelle la session puis révoque le jeton à la déconnexion', async () => {
    const supabase = client();
    const signIn = await supabase.auth.signInWithPassword({
      email: 'karim@khedma.test',
      password: 'Khedma2026!',
    });
    const first = signIn.data.session;
    expect(first).toBeTruthy();

    const refreshed = await supabase.auth.refreshSession();
    expect(refreshed.error).toBeNull();
    expect(refreshed.data.session?.refresh_token).not.toBe(first?.refresh_token);

    const lastRefreshToken = refreshed.data.session?.refresh_token as string;
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'local' });
    expect(signOutError).toBeNull();

    // Après déconnexion, le jeton de renouvellement est révoqué côté serveur :
    // l'application traite cette erreur comme une session expirée.
    const reuse = await client().auth.refreshSession({ refresh_token: lastRefreshToken });
    expect(reuse.data.session).toBeNull();
    expect([
      'refresh_token_not_found',
      'session_not_found',
      'refresh_token_already_used',
    ]).toContain(reuse.error?.code);
  });
});

describe('règles de mot de passe appliquées par Supabase (cohérentes avec Zod)', () => {
  it.each([
    ['trop court', 'Ab1'],
    ['sans majuscule', 'abcdefg1'],
    ['sans chiffre', 'Abcdefgh'],
    ['majuscule non latine seulement', 'Élodie2026'.toLowerCase().replace('é', 'É')],
  ])('refuse un mot de passe %s, avant toute création de compte', async (_, password) => {
    // Le même mot de passe est aussi refusé côté application.
    expect(
      signUpSchema.safeParse({
        firstName: 'Test',
        lastName: 'Test',
        email: 'test@khedma.test',
        phone: '0555000000',
        password,
        confirmPassword: password,
        acceptTerms: true,
      }).success,
    ).toBe(false);

    const { data, error } = await client().auth.signUp({
      email: `regle-mdp-${Date.now()}@khedma.test`,
      password,
    });
    expect(data.user).toBeNull();
    expect(error?.code).toBe('weak_password');
  });
});
