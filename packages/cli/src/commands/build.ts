import { Buffer } from 'node:buffer'

import * as fs from 'node:fs'
import * as path from 'node:path'
import { PassThrough } from 'node:stream'
import archiver from 'archiver'
import * as esbuild from 'esbuild'

const VPKG_MAGIC = Buffer.from([0x56, 0x50, 0x4B, 0x47, 0x00, 0x01])

export async function buildPlugin(args: string[]): Promise<void> {
  const minify = args.includes('--minify')
  const pluginDirArg = args.find(a => !a.startsWith('--'))

  if (!pluginDirArg) {
    console.log('用法: vonic build <plugin-dir> [--minify]')
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

  const buildDir = path.join(pluginDir, '.build')
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true })
  }
  fs.mkdirSync(buildDir, { recursive: true })

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

  const tsFiles = findFiles(buildDir, '.ts')
  if (tsFiles.length > 0) {
    console.log(`🔧 编译 TypeScript 文件...`)

    for (const tsFile of tsFiles) {
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
      fs.unlinkSync(tsFile)

      console.log(`  ✓ ${path.basename(tsFile)} -> ${path.basename(jsFile)}`)
    }

    const buildManifestPath = path.join(buildDir, 'manifest.json')
    const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf-8'))
    if (buildManifest.main.endsWith('.ts')) {
      buildManifest.main = buildManifest.main.replace(/\.ts$/, '.js')
      fs.writeFileSync(buildManifestPath, JSON.stringify(buildManifest, null, 2))
      console.log(`  ✓ 更新 manifest.json 入口为 ${buildManifest.main}`)
    }
  }

  const dtsFiles = findFiles(buildDir, '.d.ts')
  for (const dtsFile of dtsFiles) {
    fs.unlinkSync(dtsFile)
  }

  const outputVpkg = path.join(path.dirname(pluginDir), `${pluginId}.vpkg`)
  console.log(`📦 打包成 .vpkg...`)

  if (fs.existsSync(outputVpkg)) {
    fs.unlinkSync(outputVpkg)
  }

  await new Promise<void>((resolve, reject) => {
    const chunks: Buffer[] = []
    const passThrough = new PassThrough()
    const archive = archiver('zip', { zlib: { level: 9 } })

    passThrough.on('data', (chunk: Buffer) => chunks.push(chunk))
    passThrough.on('end', () => {
      const zipData = Buffer.concat(chunks)
      const vpkgData = Buffer.concat([VPKG_MAGIC, zipData])
      fs.writeFileSync(outputVpkg, vpkgData)
      console.log(`  ✓ ${outputVpkg} (${(vpkgData.length / 1024).toFixed(1)} KB)`)
      fs.rmSync(buildDir, { recursive: true })
      console.log('')
      console.log(`✅ 插件打包完成: ${outputVpkg}`)
      console.log('')
      console.log('安装方式:')
      console.log('  在应用中点击"安装插件"，选择生成的 .vpkg 文件')
      resolve()
    })

    archive.on('error', (err: Error) => {
      console.error('打包失败:', err.message)
      fs.rmSync(buildDir, { recursive: true })
      reject(err)
    })

    archive.pipe(passThrough)
    archive.directory(buildDir, false)
    archive.finalize()
  })
}

function findFiles(dir: string, ext: string): string[] {
  const results: string[] = []
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
