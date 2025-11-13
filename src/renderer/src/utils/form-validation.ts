import type { FormInstance } from 'ant-design-vue'
import type { FieldLabelMode } from './field-labels'
import { getFieldLabel } from './field-labels'

/**
 * 检查是否为正实数
 */
export function isPositiveReal(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0
}

/**
 * 生成正数校验错误消息
 */
export function msgOf(key: string, fieldLabelMode: FieldLabelMode): string {
  return `${getFieldLabel(key as any, fieldLabelMode)}应输入大于0的实数，请重新输入！`
}

/**
 * 创建正数字段的校验规则
 */
export function createPositiveFieldRules(fields: string[], fieldLabelMode: FieldLabelMode): Record<string, any[]> {
  const rules: Record<string, any[]> = {}

  fields.forEach((key) => {
    rules[key] = [
      {
        validator: (_: any, v: any) => {
          // 不允许空值
          if (v === null || v === undefined || v === '')
            return Promise.reject(msgOf(key, fieldLabelMode))
          // 处理字符串 '0' 的情况
          const numValue = typeof v === 'string' ? Number(v) : v
          // 如果输入了0（无论是数字0还是字符串'0'），必须拒绝
          if (numValue === 0)
            return Promise.reject(msgOf(key, fieldLabelMode))
          // 验证是否为正数
          return isPositiveReal(numValue) ? Promise.resolve() : Promise.reject(msgOf(key, fieldLabelMode))
        },
        trigger: 'blur',
      },
    ]
  })

  return rules
}

/**
 * 创建成对约束校验规则（内径 < 外径）
 */
export function createPairConstraintRules(
  innerField: string,
  outerField: string,
  innerLabel: string,
  outerLabel: string,
  formModel: any,
): Record<string, any[]> {
  const rules: Record<string, any[]> = {}

  // 内径校验规则
  rules[innerField] = [
    {
      validator: (_: any, v: any) => {
        const outer = formModel[outerField]
        if (!isPositiveReal(v) || !isPositiveReal(outer))
          return Promise.resolve()
        return v < outer ? Promise.resolve() : Promise.reject(new Error(`${innerLabel}应小于${outerLabel}，请重新输入！`))
      },
      trigger: 'change',
    },
  ]

  // 外径校验规则
  rules[outerField] = [
    {
      validator: (_: any, v: any) => {
        const inner = formModel[innerField]
        if (!isPositiveReal(v) || !isPositiveReal(inner))
          return Promise.resolve()
        return v > inner ? Promise.resolve() : Promise.reject(new Error(`${outerLabel}应大于${innerLabel}，请重新输入！`))
      },
      trigger: 'change',
    },
  ]

  return rules
}

/**
 * 处理字段变更的联动校验
 */
export async function handleFieldChange(
  name: string,
  val: number | null,
  formModel: any,
  prevModel: any,
  formRef: FormInstance | undefined,
  updateStoreCallback: (name: string, val: number | null) => void,
  pairPartners: Record<string, string>,
): Promise<void> {
  const prev = prevModel[name]
  formModel[name] = val

  try {
    await formRef?.validateFields([name])
    prevModel[name] = val
    updateStoreCallback(name, val)

    // 变更一方后，联动校验另一方，清除或更新其错误提示
    const partner = pairPartners[name]
    if (partner) {
      // 如果对方字段有值，才进行联动验证
      const partnerValue = formModel[partner]
      if (partnerValue !== null && partnerValue !== undefined && partnerValue !== '') {
        try {
          await formRef?.validateFields([partner])
        }
        catch {
          // 不在此处回退另一字段，保持用户对另一字段的控制；仅更新其错误状态
        }
      }
      else {
        // 如果对方字段为空，清除其验证错误
        formRef?.clearValidate([partner])
      }
    }
  }
  catch {
    // 去掉轻提示，只保留表单字段的错误提示
    formModel[name] = prev
  }
}
