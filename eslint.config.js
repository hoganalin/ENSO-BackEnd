import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import pluginReact from 'eslint-plugin-react';
import globals from 'globals';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'bootstrap/**', group: 'external', position: 'after' },
            { pattern: '**/*.scss', group: 'sibling', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
        },
      ],
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
  pluginReact.configs.flat.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // React 17+ 新 JSX transform 不需要 import React
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // HexSchool 課程 API 回的物件命名是 snake_case，不寫 PropTypes
      'react/prop-types': 'off',
      // ' 等中文/特殊字元 inline 在 JSX 內合法
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.vercel/**', 'build/**'],
  },
]);
