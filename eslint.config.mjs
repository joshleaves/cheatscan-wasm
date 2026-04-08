// @ts-check
import globals from 'globals'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import js from '@eslint/js'
import { FlatCompat } from '@eslint/eslintrc'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

export default tseslint.config(
  ...compat.extends('eslint:recommended'),
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
  },
  {
    ignores: ['test.js', '_tests/', '.wrangler', 'node_modules/', 'dist/', 'doc/', 'public/', 'OLD/'],
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs,
        ...globals.mocha,
        ...globals.node,
      },
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      // 'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single'],
      'semi': ['error', 'never'],
      'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'no-trailing-spaces': 'error',
      'padding-line-between-statements': [
        'error',
        { 'blankLine': 'always', 'prev': 'block-like', 'next': '*' },
        // { 'blankLine': 'any', 'prev': '*', 'next': '*' },
      ]
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: {
      '@stylistic': stylistic

    },
    rules: {
      'no-unused-vars': 'off',
      '@stylistic/indent': ['error', 2],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    }
  }
)
