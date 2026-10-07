import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]" }],
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // React 放最上面
            ["^react", "^react-dom"],
            // 第三方套件
            ["^@?\\w"],
            // 靜態資源 (CSS, SCSS, 圖片等)
            ["^.+\\.(css|scss|png|jpg|svg)$"],
            // 本地 alias (例如 @/utils, @/components)
            ["^@/"],
            // 相對路徑
            ["^\\./", "^\\.\\./"],
            // 型別匯入放最後
            ["^.+\\.(ts|tsx|d\\.ts)$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
]);
