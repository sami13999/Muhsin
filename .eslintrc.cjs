/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  rules: {
    // ── MUSHIN custom rules (Doc-25 / ADR enforcement) ──────────────
    'no-restricted-syntax': [
      'error',
      {
        selector: 'CallExpression[callee.name="query"][arguments.0.type="Literal"]',
        message:
          'Raw SQL is forbidden. Use parameterized queries or the query builder. See Doc-25 §4.1.',
      },
      {
        selector:
          'CallExpression[callee.property.name="raw"][arguments.0.type="Literal"]',
        message:
          'Raw SQL is forbidden. Use parameterized queries or the query builder. See Doc-25 §4.1.',
      },
    ],

    // ── TypeScript strictness ────────────────────────────────────────
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { prefer: 'type-imports' },
    ],
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-misused-promises': 'warn',
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',

    // ── General ──────────────────────────────────────────────────────
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'warn',
    'no-var': 'error',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-useless-escape': 'off',
    'no-empty': 'off',
    'no-useless-catch': 'off',
  },
  overrides: [
    {
      files: ['*.test.ts', '*.spec.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
      },
    },
    {
      files: ['**/apps/web/**', 'apps/web/**', '**/apps/web/**/*.{ts,tsx}'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/no-confusing-void-expression': 'off',
        '@typescript-eslint/no-unnecessary-condition': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/array-type': 'off',
        '@typescript-eslint/no-invalid-void-type': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/require-await': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'no-console': 'off',
        'no-empty': 'off',
        'no-useless-escape': 'off',
        'prefer-const': 'off',
        'eqeqeq': 'off',
      },
    },
  ],
  ignorePatterns: ['node_modules', 'dist', 'coverage', '*.js', '*.cjs'],
};
