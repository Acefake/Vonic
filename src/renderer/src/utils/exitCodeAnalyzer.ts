/**
 * EXE 退出码分析工具
 */

/**
 * 退出码类型
 */
export enum ExitCodeType {
  SUCCESS = 'success', // 成功
  RETRIABLE = 'retriable', // 可重试的错误
  FATAL = 'fatal', // 致命错误，不可重试
}

/**
 * 退出码信息
 */
export interface ExitCodeInfo {
  code: number
  type: ExitCodeType
  description: string
  suggestion: string
}

/**
 * 分析退出码
 * @param exitCode 退出码
 * @returns 退出码信息
 */
export function analyzeExitCode(exitCode: number | null | undefined): ExitCodeInfo {
  if (exitCode === null || exitCode === undefined) {
    return {
      code: -1,
      type: ExitCodeType.FATAL,
      description: '进程异常终止（未知退出码）',
      suggestion: '检查程序是否被强制终止',
    }
  }

  // 成功
  if (exitCode === 0) {
    return {
      code: 0,
      type: ExitCodeType.SUCCESS,
      description: '执行成功',
      suggestion: '',
    }
  }

  // 普通错误 (1)
  if (exitCode === 1) {
    return {
      code: 1,
      type: ExitCodeType.RETRIABLE,
      description: '一般性错误（可能是输入数据问题或计算错误）',
      suggestion: '建议重试，如果持续失败请检查输入数据',
    }
  }

  // 访问冲突 (0x80000003 = 2147483651)
  if (exitCode === 2147483651 || exitCode === -2147483645) {
    return {
      code: exitCode,
      type: ExitCodeType.RETRIABLE,
      description: '访问冲突或断点异常（可能是资源竞争）',
      suggestion: '建议重试，可能是内存访问冲突或资源竞争',
    }
  }

  // 栈溢出 (0xC00000FD = -1073741571)
  if (exitCode === -1073741571 || exitCode === 3221225725) {
    return {
      code: exitCode,
      type: ExitCodeType.FATAL,
      description: '栈溢出',
      suggestion: '输入数据过大，建议调整参数或增加系统资源',
    }
  }

  // 访问违规 (0xC0000005 = -1073741819)
  if (exitCode === -1073741819 || exitCode === 3221225477) {
    return {
      code: exitCode,
      type: ExitCodeType.RETRIABLE,
      description: '内存访问违规',
      suggestion: '建议重试，可能是内存访问冲突',
    }
  }

  // 整数除以零 (0xC0000094 = -1073741676)
  if (exitCode === -1073741676 || exitCode === 3221225620) {
    return {
      code: exitCode,
      type: ExitCodeType.FATAL,
      description: '除零错误',
      suggestion: '输入数据导致除零，请检查输入参数',
    }
  }

  // 浮点异常 (0xC0000090 = -1073741680)
  if (exitCode === -1073741680 || exitCode === 3221225616) {
    return {
      code: exitCode,
      type: ExitCodeType.FATAL,
      description: '浮点运算异常',
      suggestion: '输入数据导致浮点异常，请检查输入参数',
    }
  }

  // 非法指令 (0xC000001D = -1073741795)
  if (exitCode === -1073741795 || exitCode === 3221225501) {
    return {
      code: exitCode,
      type: ExitCodeType.FATAL,
      description: '非法指令',
      suggestion: 'EXE 程序损坏或不兼容',
    }
  }

  // 文件未找到 (2)
  if (exitCode === 2) {
    return {
      code: 2,
      type: ExitCodeType.FATAL,
      description: '文件未找到',
      suggestion: '检查输入文件是否存在',
    }
  }

  // 其他错误码
  if (exitCode > 0 && exitCode < 128) {
    return {
      code: exitCode,
      type: ExitCodeType.RETRIABLE,
      description: `程序返回错误码 ${exitCode}`,
      suggestion: '建议重试',
    }
  }

  // 系统错误或异常终止
  return {
    code: exitCode,
    type: ExitCodeType.RETRIABLE,
    description: `异常终止（退出码: ${exitCode}）`,
    suggestion: '建议重试，如果持续失败请检查系统资源',
  }
}

/**
 * 判断是否可以重试
 * @param exitCode 退出码
 * @returns 是否可以重试
 */
export function isRetriable(exitCode: number | null | undefined): boolean {
  const info = analyzeExitCode(exitCode)
  return info.type === ExitCodeType.RETRIABLE
}

/**
 * 获取退出码描述
 * @param exitCode 退出码
 * @returns 描述信息
 */
export function getExitCodeDescription(exitCode: number | null | undefined): string {
  const info = analyzeExitCode(exitCode)
  return `${info.description}${info.suggestion ? ` - ${info.suggestion}` : ''}`
}
