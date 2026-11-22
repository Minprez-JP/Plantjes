import babelParser from '@babel/eslint-parser'
import securityPlugin from './tools/security-lint/rules.mjs'

const rules = {
  'plantjes/no-dangerous-html': 'error',
  'plantjes/no-dynamic-code': 'error',
  'plantjes/no-dynamic-import': 'error',
  'plantjes/no-unsafe-navigation': 'error',
}

const languageOptions = {
  ecmaVersion: 2022,
  sourceType: 'module',
  parser: babelParser,
  parserOptions: {
    requireConfigFile: false,
    babelOptions: {
      presets: [
        '@babel/preset-typescript',
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    },
  },
}

export const securityConfig = {
  files: ['**/*.{ts,tsx,js,jsx}'],
  languageOptions,
  plugins: { plantjes: securityPlugin },
  rules,
}

// Used by the fixture tests; identical to the production config but does not
// ignore the deliberate-violation fixtures.
export const fixtureConfig = [securityConfig]

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'artifacts/**',
      'tools/security-lint/fixtures/**',
      'coverage/**',
    ],
  },
  securityConfig,
]
