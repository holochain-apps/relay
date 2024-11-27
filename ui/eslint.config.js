import eslintPluginSvelte from "eslint-plugin-svelte";

export default [
  ...eslintPluginSvelte.configs["flat/recommended"],
  {
    files: ["**/*.svelte", "*.svelte", "**/*.ts", "*.ts"],
    languageOptions: {
      parserOptions: {
        svelteConfig: "./svelte.config.js",
      },
    },
  },
];
