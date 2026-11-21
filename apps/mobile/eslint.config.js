// https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');
const i18next = require('eslint-plugin-i18next');

module.exports = defineConfig([
  globalIgnores(['dist/*', '.expo/*', 'android/*', 'ios/*']),
  expoConfig,
  {
    // Exigence bilingue : aucun texte visible codé en dur dans le JSX.
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },
  prettier,
]);
