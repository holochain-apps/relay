import eslintPluginSvelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';
export default [
  ...eslintPluginSvelte.configs['flat/recommended'],
  {
    files: [
      '**/*.svelte',
      '*.svelte',
      // Add more files if you need.
      '**/*.ts',
      '*.ts'
      // '**/*.svelte.ts', '*.svelte.ts', '**/*.svelte.js', '*.svelte.js',
    ],
    languageOptions: {
      parserOptions: {
        // Specify the `svelte.config.js`.
        svelteConfig
      }
    }
  }
];