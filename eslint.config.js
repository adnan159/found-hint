import css from "@eslint/css";
import js from "@eslint/js";
import json from "@eslint/json";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";
import globals from "globals";

export default defineConfig([
  eslintPluginPrettierRecommended,
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  {
    ...pluginReact.configs.flat.recommended,
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "no-console": "warn",
      "prettier/prettier": [
        "error",
        {
          printWidth: 80,
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { "@typescript-eslint": tsPlugin },
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.css"],
    plugins: { css },
    language: "css/css",
    extends: ["css/recommended"],
  },
]);
