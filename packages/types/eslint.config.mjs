import base from '@khedma/config/eslint/base';

// database.ts est généré depuis le schéma Supabase (pnpm cloud test types) : pas de lint.
export default [{ ignores: ['src/database.ts'] }, ...base];
