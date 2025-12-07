import { buildPlugin } from './commands/build.js'
import { createPlugin } from './commands/create.js'

const args = process.argv.slice(2)
const command = args[0]

async function main(): Promise<void> {
  switch (command) {
    case 'build':
      await buildPlugin(args.slice(1))
      break
    case 'create':
      await createPlugin(args.slice(1))
      break
    case 'help':
    case '--help':
    case '-h':
      printHelp()
      break
    default:
      console.log(`未知命令: ${command}`)
      printHelp()
      process.exit(1)
  }
}

function printHelp(): void {
  console.log(`
Vonic CLI - 插件开发工具

用法:
  vonic <command> [options]

命令:
  build <plugin-dir>   打包插件
  create <plugin-name> 创建新插件
  help                 显示帮助信息

选项:
  --minify             压缩代码 (build 命令)

示例:
  vonic build ./my-plugin --minify
  vonic create my-awesome-plugin
`)
}

main().catch((err) => {
  console.error('错误:', err.message)
  process.exit(1)
})
