import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Tests unitaires de logique pure (sans dépendance React Native).
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
