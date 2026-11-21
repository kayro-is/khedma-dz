// Typage strict des clés de traduction : t('cle.inexistante') provoque une erreur TypeScript.
import 'i18next';

import type fr from './locales/fr.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr };
    returnNull: false;
  }
}
