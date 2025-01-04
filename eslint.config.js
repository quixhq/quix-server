// eslint.config.js
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist"], // Ignored files and directories
  },
  {
    files: ["**/*.ts", "**/*.tsx"], // Apply configuration to TypeScript files
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: "module",
        project: "tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules, // Load recommended TypeScript rules
      "prettier/prettier": "error", // Enforce Prettier formatting
      "semi": ["error", "never"], // Disable semicolons
    },
  },
  {
    languageOptions: {
      globals: {
        node: true, // Enable Node.js global variables
      },
    },
  },
];
