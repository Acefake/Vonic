/**
 * electron-builder afterPack 钩子
 * 在打包完成后执行清理和优化操作
 */

const fs = require('fs')
const path = require('path')

/**
 * @param {import('electron-builder').AfterPackContext} context
 */
exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir
  const platform = context.electronPlatformName

  console.log(`\n📦 AfterPack: Processing ${platform} build...`)

  // 需要删除的不必要文件
  const filesToRemove = [
    'LICENSE.electron.txt',
    'LICENSES.chromium.html',
    'version',
  ]

  // 需要删除的不必要目录
  const dirsToRemove = [
    'locales', // 如果不需要多语言支持，可以删除
  ]

  // 保留的语言包（如果需要多语言，取消注释并修改 dirsToRemove）
  // const keepLocales = ['en-US.pak', 'zh-CN.pak', 'zh-TW.pak']

  try {
    // 删除不必要的文件
    for (const file of filesToRemove) {
      const filePath = path.join(appOutDir, file)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`  ✓ Removed: ${file}`)
      }
    }

    // 删除不必要的目录
    for (const dir of dirsToRemove) {
      const dirPath = path.join(appOutDir, dir)
      if (fs.existsSync(dirPath)) {
        // 如果需要保留部分语言包，在这里处理
        // if (dir === 'locales') {
        //   const files = fs.readdirSync(dirPath)
        //   for (const file of files) {
        //     if (!keepLocales.includes(file)) {
        //       fs.unlinkSync(path.join(dirPath, file))
        //     }
        //   }
        // } else {
        fs.rmSync(dirPath, { recursive: true, force: true })
        console.log(`  ✓ Removed directory: ${dir}`)
        // }
      }
    }

    console.log(`✅ AfterPack completed for ${platform}\n`)
  }
  catch (error) {
    console.error(`❌ AfterPack error: ${error.message}`)
  }
}
