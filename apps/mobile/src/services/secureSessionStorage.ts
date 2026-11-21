/**
 * Stockage de session pour Supabase Auth.
 *
 * - La session (jetons) est chiffrée en AES-256-GCM puis stockée dans AsyncStorage
 *   (SecureStore est limité à ~2 Ko par entrée, une session Supabase est plus grande).
 * - La clé AES (aléatoire, renouvelée à chaque écriture) est stockée dans SecureStore :
 *   Keychain iOS / Keystore Android, liée à cet appareil et non sauvegardée.
 * - Données illisibles ou clé absente → session effacée : l'utilisateur se reconnecte.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import {
  base64ToBytes,
  bytesToBase64,
  decryptValue,
  encryptValue,
  KEY_LENGTH,
  NONCE_LENGTH,
  secureStoreKeyName,
} from './sessionCrypto';

const DATA_PREFIX = 'khedma.session.';

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  // Disponible après le premier déverrouillage (rafraîchissement en arrière-plan), jamais restauré sur un autre appareil.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function removeItem(name: string): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(DATA_PREFIX + name),
    SecureStore.deleteItemAsync(secureStoreKeyName(name), SECURE_OPTIONS).catch(() => undefined),
  ]);
}

async function getItem(name: string): Promise<string | null> {
  const encrypted = await AsyncStorage.getItem(DATA_PREFIX + name);
  if (!encrypted) return null;
  const keyBase64 = await SecureStore.getItemAsync(secureStoreKeyName(name), SECURE_OPTIONS);
  if (!keyBase64) {
    await removeItem(name);
    return null;
  }
  try {
    return decryptValue(encrypted, base64ToBytes(keyBase64));
  } catch {
    await removeItem(name);
    return null;
  }
}

async function setItem(name: string, value: string): Promise<void> {
  const key = getRandomBytes(KEY_LENGTH);
  const encrypted = encryptValue(value, key, getRandomBytes(NONCE_LENGTH));
  await SecureStore.setItemAsync(secureStoreKeyName(name), bytesToBase64(key), SECURE_OPTIONS);
  await AsyncStorage.setItem(DATA_PREFIX + name, encrypted);
}

/**
 * Sur le web (non ciblé par l'application), SecureStore n'existe pas : stockage navigateur standard.
 */
export const secureSessionStorage =
  Platform.OS === 'web'
    ? {
        getItem: (name: string) => AsyncStorage.getItem(DATA_PREFIX + name),
        setItem: (name: string, value: string) => AsyncStorage.setItem(DATA_PREFIX + name, value),
        removeItem: (name: string) => AsyncStorage.removeItem(DATA_PREFIX + name),
      }
    : { getItem, setItem, removeItem };
