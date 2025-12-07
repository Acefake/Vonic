import type { FileFilter } from '@/main/core/types'

/**
 * 允许读取的文件扩展名白名单
 * 根据实际业务需求修改此列表
 */
export const ALLOWED_READ_EXTENSIONS = [
  // 文本文件
  '.txt',
  '.md',
  '.markdown',

  // 配置文件
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',

  // 代码文件
  '.js',
  '.ts',
  '.jsx',
  '.tsx',
  '.vue',
  '.css',
  '.scss',
  '.less',
  '.html',
  '.py',
  '.java',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.go',
  '.rs',
  '.php',
  '.rb',
  '.sh',

  // 数据文件
  '.csv',
  '.xml',
  '.sql',
  '.dat',
  '.xlsx',
  '.xls',
  // 可执行文件（用于读取嵌入的配置数据）
  '.exe',

  // 日志文件
  '.log',

  // 文档文件（只读，不可写）
  '.pdf',
  '.doc',
  '.docx',
]

/**
 * 允许写入的文件扩展名白名单
 * 为安全起见，写入权限应该比读取权限更严格
 */
export const ALLOWED_WRITE_EXTENSIONS = [
  // 文本文件
  '.txt',
  '.md',

  // 配置文件
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',

  // 数据文件
  '.csv',
  '.xml',

  // 日志文件
  '.log',
]

/**
 * 允许删除的文件扩展名白名单
 */
export const ALLOWED_DELETE_EXTENSIONS = [
  // 文本文件
  '.txt',
  '.md',

  // 配置文件
  '.json',
  '.yaml',
  '.yml',

  // 数据文件
  '.csv',
  '.xml',

  // 日志和临时文件
  '.log',
  '.tmp',
  '.temp',
  '.bak',
  '.backup',
  '.cache',
]

/**
 * 危险文件扩展名黑名单
 * 这些文件类型永远不应该被操作
 */
export const DANGEROUS_EXTENSIONS = [
  // 可执行文件
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.scr',
  '.msi',
  '.dll',
  '.so',
  '.dylib',

  // 脚本文件（可能包含恶意代码）
  '.vbs',
  '.ps1',
  '.psm1',

  // 系统文件
  '.sys',
  '.ini', // 某些系统 ini 文件可能很危险
]

/**
 * 将扩展名数组转换为 Electron 文件过滤器格式
 * @param extensions 扩展名数组（如 ['.txt', '.md']）
 * @returns 去除点号的扩展名数组（如 ['txt', 'md']）
 */
function stripDots(extensions: string[]): string[] {
  return extensions.map(ext => ext.replace(/^\./, ''))
}

/**
 * 生成用于文件选择对话框的过滤器（读取）
 */
export const FILE_FILTERS_FOR_READ: FileFilter[] = [
  {
    name: '所有允许的文件',
    extensions: stripDots(ALLOWED_READ_EXTENSIONS),
  },
  {
    name: '文本文件',
    extensions: ['txt', 'md', 'markdown'],
  },
  {
    name: '配置文件',
    extensions: ['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config'],
  },
  {
    name: '数据文件',
    extensions: ['csv', 'xml', 'sql', 'log', 'xlsx', 'xls'],
  },
  {
    name: 'Excel 文件',
    extensions: ['xlsx', 'xls'],
  },
  {
    name: '图片文件',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'],
  },
]

/**
 * 生成用于文件选择对话框的过滤器（写入）
 */
export const FILE_FILTERS_FOR_WRITE: FileFilter[] = [
  {
    name: '所有允许的文件',
    extensions: stripDots(ALLOWED_WRITE_EXTENSIONS),
  },
  {
    name: '文本文件',
    extensions: ['txt', 'md', 'markdown'],
  },
  {
    name: '配置文件',
    extensions: ['json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config'],
  },
  {
    name: '数据文件',
    extensions: ['csv', 'xml', 'sql'],
  },
]

/**
 * 配置说明
 *
 * 如何添加新的文件类型：
 * 1. 在对应的数组中添加扩展名（小写，带点号）
 * 2. 考虑安全性：读取 > 写入 > 删除
 * 3. 确保不在危险文件列表中
 * 4. 更新 FILE_FILTERS_FOR_READ/WRITE 对话框过滤器
 *
 * 安全建议：
 * 1. 只添加业务需要的文件类型
 * 2. 定期审查白名单配置
 * 3. 对敏感操作添加额外验证
 * 4. 对话框过滤器是用户体验优化，后端验证是安全保障
 */
