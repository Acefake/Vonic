import antfu from '@antfu/eslint-config'

export default antfu({
  rules: {
    'n/prefer-global/process': 'off',
    'ts/no-require-imports': 'off',
    'no-console': 'off',
  },
})
