import antfu from '@antfu/eslint-config'

export default antfu({
  // formatters: {
  //   /**
  //    * Format CSS, LESS, SCSS files, also the `<style>` blocks in Vue
  //    * By default uses Prettier
  //    */
  //   css: true,
  //   /**
  //    * Format HTML files
  //    * By default uses Prettier
  //    */
  //   html: true,
  //   /**
  //    * Format Markdown files
  //    * Supports Prettier and dprint
  //    * By default uses Prettier
  //    */
  //   markdown: true,
  // },
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
