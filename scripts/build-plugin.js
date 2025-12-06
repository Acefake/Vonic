#!/usr/bin/env node
/**
 * 插件打包脚本
 * 用法: node scripts/build-plugin.js <plugin-dir> [--minify]
 * 示例: node scripts/build-plugin.js examples/todo-list --minify
 *
 * 功能:
 * 1. 编译 TypeScript 为 JavaScript
 * 2. 压缩代码（可选）
 * 3. 更新 manifest.json 入口
 * 4. 打包成 .vpkg 文件（Vonic 专属插件包格式）
 *
 * .vpkg 格式说明:
 * - 魔数头: VPKG\x00\x01 (6 字节)
 * - 内容: ZIP 压缩数据
 */

// Vonic 插件包魔数头
const VPKG_MAGIC = Buffer.from([0x56, 0x50, 0x4B, 0x47, 0x00, 0x01]) // 'VPKG' + version 1

const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
const minify = args.includes('--minify')
const pluginDirArg = args.find(a => !a.startsWith('--'))

if (!pluginDirArg) {
  console.log('用法: node scripts/build-plugin.js <plugin-dir> [--minify]')
  console.log('示例: node scripts/build-plugin.js examples/todo-list --minify')
  console.log('')
  console.log('选项:')
  console.log('  --minify  压缩代码')
  process.exit(1)
}

const pluginDir = path.resolve(pluginDirArg)

if (!fs.existsSync(pluginDir)) {
  console.error(`错误: 目录不存在: ${pluginDir}`)
  process.exit(1)
}

const manifestPath = path.join(pluginDir, 'manifest.json')
if (!fs.existsSync(manifestPath)) {
  console.error('错误: manifest.json 不存在')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
const pluginId = manifest.id

console.log(`📦 开始打包插件: ${manifest.name} (${pluginId})${minify ? ' [压缩]' : ''}`)

// 创建临时构建目录
const buildDir = path.join(pluginDir, '.build')
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true })
}
fs.mkdirSync(buildDir, { recursive: true })

// 复制所有文件到构建目录
const filesToCopy = fs.readdirSync(pluginDir).filter(f =>
  f !== '.build'
  && f !== 'node_modules'
  && !f.endsWith('.zip')
  && !f.endsWith('.vpkg'),
)

for (const file of filesToCopy) {
  const srcPath = path.join(pluginDir, file)
  const destPath = path.join(buildDir, file)

  if (fs.statSync(srcPath).isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true })
  }
  else {
    fs.copyFileSync(srcPath, destPath)
  }
}

// 编译 TypeScript 文件
const tsFiles = findFiles(buildDir, '.ts')
if (tsFiles.length > 0) {
  console.log(`🔧 编译 TypeScript 文件...`)

  try {
    // 使用 esbuild 编译
    const esbuild = require('esbuild')

    for (const tsFile of tsFiles) {
      // 跳过 .d.ts 文件
      if (tsFile.endsWith('.d.ts'))
        continue

      const jsFile = tsFile.replace(/\.ts$/, '.js')
      const tsCode = fs.readFileSync(tsFile, 'utf-8')

      const result = esbuild.transformSync(tsCode, {
        loader: 'ts',
        format: 'cjs',
        target: 'node18',
        minify,
        minifyWhitespace: minify,
        minifyIdentifiers: minify,
        minifySyntax: minify,
      })

      fs.writeFileSync(jsFile, result.code)
      fs.unlinkSync(tsFile) // 删除 ts 文件

      console.log(`  ✓ ${path.basename(tsFile)} -> ${path.basename(jsFile)}`)
    }

    // 更新 manifest.json 入口
    const buildManifestPath = path.join(buildDir, 'manifest.json')
    const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf-8'))
    if (buildManifest.main.endsWith('.ts')) {
      buildManifest.main = buildManifest.main.replace(/\.ts$/, '.js')
      fs.writeFileSync(buildManifestPath, JSON.stringify(buildManifest, null, 2))
      console.log(`  ✓ 更新 manifest.json 入口为 ${buildManifest.main}`)
    }
  }
  catch (e) {
    console.error('TypeScript 编译失败:', e.message)
    fs.rmSync(buildDir, { recursive: true })
    process.exit(1)
  }
}

// 删除类型定义文件
const dtsFiles = findFiles(buildDir, '.d.ts')
for (const dtsFile of dtsFiles) {
  fs.unlinkSync(dtsFile)
}

// 打包成 .vpkg
const outputVpkg = path.join(path.dirname(pluginDir), `${pluginId}.vpkg`)
console.log(`📦 打包成 .vpkg...`)

// 删除旧的 .vpkg
if (fs.existsSync(outputVpkg)) {
  fs.unlinkSync(outputVpkg)
}

// 使用 archiver 打包，先生成 zip 到内存
const archiver = require('archiver')
const { PassThrough } = require('node:stream')

const chunks = []
const passThrough = new PassThrough()
const archive = archiver('zip', { zlib: { level: 9 } })

passThrough.on('data', chunk => chunks.push(chunk))
passThrough.on('end', () => {
  // 合并 ZIP 数据
  const zipData = Buffer.concat(chunks)
  // 写入 .vpkg 文件：魔数头 + ZIP 数据
  const vpkgData = Buffer.concat([VPKG_MAGIC, zipData])
  fs.writeFileSync(outputVpkg, vpkgData)
  console.log(`  ✓ ${outputVpkg} (${(vpkgData.length / 1024).toFixed(1)} KB)`)
  // 清理构建目录
  fs.rmSync(buildDir, { recursive: true })
  console.log('')
  console.log(`✅ 插件打包完成: ${outputVpkg}`)
  console.log('')
  console.log('安装方式:')
  console.log('  在应用中点击"安装插件"，选择生成的 .vpkg 文件')
})

archive.on('error', (err) => {
  console.error('打包失败:', err.message)
  fs.rmSync(buildDir, { recursive: true })
  process.exit(1)
})

archive.pipe(passThrough)
archive.directory(buildDir, false)
archive.finalize()

// 工具函数：递归查找文件
function findFiles(dir, ext) {
  const results = []
  const files = fs.readdirSync(dir)

  for (const file of files) {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      results.push(...findFiles(filePath, ext))
    }
    else if (file.endsWith(ext)) {
      results.push(filePath)
    }
  }

  return results
}
