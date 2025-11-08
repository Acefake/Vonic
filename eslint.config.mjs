import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'n/prefer-global/process': 'off',
    'ts/no-require-imports': 'off',
    'no-console': 'off',
  },

  type: 'lib',

  ignores: [
    '**/extension',
  ],

  // Parse the `.gitignore` file to get the ignores, on by default
  gitignore: true,

  stylistic: {
    indent: 2, // 4, or 'tab'
    quotes: 'single', // or 'double'
  },

  // TypeScript and Vue are autodetected, you can also explicitly enable them:
  typescript: true,
  vue: true,
})
