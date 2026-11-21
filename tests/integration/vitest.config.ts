import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 20_000,
    // Les tests partagent la même base locale : exécution séquentielle.
    fileParallelism: false,
  },
});
