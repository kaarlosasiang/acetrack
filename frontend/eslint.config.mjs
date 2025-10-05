import { FlatCompat } from "@eslint/eslintrc";
import prettierPlugin from "eslint-plugin-prettier";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Detect unused imports and variables
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // Remove unused imports automatically
      "no-unused-vars": "off", // Turn off base rule as it conflicts with @typescript-eslint version

      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "off", // Allow any type

      // Additional useful rules for clean code
      "prefer-const": "error",
      "no-var": "error",
      "no-console": "warn",

      // Prettier integration
      "prettier/prettier": "error",
    },
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".next/types/**",
      ".next/static/**",
      "public/**",
    ],
  },
];

export default eslintConfig;
