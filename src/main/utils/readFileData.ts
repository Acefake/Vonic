import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * 根据运行环境读取指定文件内容
 * @param fileName 要读取的文件名，如 Sep_power.dat
 * 生产环境：自动查找同级目录下的传入的文件名 Sep_power.dat
 * 开发环境：找到项目根目录的testFile文件夹的传入的文件名 Sep_power.dat
 * @returns 文件内容字符串
 */
export function readFileData(fileName: string): string {
  let filePath: string

  // 判断是否为开发环境（简单以是否存在 testFile 目录为判断依据）
  const isDev = fs.existsSync(path.join(process.cwd(), 'testFile'))

  if (isDev) {
    // 开发环境：读取项目根目录下 testFile 文件夹中的文件
    filePath = path.join(process.cwd(), 'testFile', fileName)
  }
  else {
    // 生产环境：读取当前执行文件同级目录下的文件
    filePath = path.join(__dirname, fileName)
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`文件不存在: ${filePath}`)
  }

  return fs.readFileSync(filePath, 'utf-8')
}
