/**
 * 对话附件的处理规则。
 *
 * 文本类文件（代码、markdown、csv 等）在前端直接读成字符串，随提问一起送给模型，
 * 模型能真正「读懂」文件内容；图片等二进制文件无法解析，先传到 OSS 后只带地址，
 * 让模型知道有这么个附件即可。
 */

/** 单文件大小上限，与后端 BlogAiController.ATTACHMENT_MAX_BYTES 保持一致 */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024

/** 文本附件读取上限：再大就会挤爆上下文预算，不如直接拒绝 */
export const TEXT_READ_MAX_BYTES = 1024 * 1024

/** 单次提问的附件个数上限，与后端 AiChatRequest 的 @Size(max = 5) 保持一致 */
export const ATTACHMENT_MAX_COUNT = 5

/** 会被当作纯文本读取的扩展名 */
const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'conf',
  'properties', 'log', 'sql', 'html', 'htm', 'css', 'scss', 'less',
  'js', 'jsx', 'ts', 'tsx', 'vue', 'svelte',
  'java', 'kt', 'py', 'go', 'rs', 'rb', 'php', 'c', 'h', 'cpp', 'hpp', 'cs', 'swift', 'dart',
  'sh', 'bat', 'gradle', 'dockerfile', 'gitignore',
])

/** 已就绪、可随提问发送的附件 */
export interface PickedAttachment {
  name: string
  /** 文本类附件的内容 */
  content?: string
  /** 二进制附件的公开地址 */
  url?: string
}

/** 判断是否按纯文本读取 */
export function isTextFile(file: File): boolean {
  if (file.type.startsWith('text/')) return true
  if (file.type === 'application/json' || file.type === 'application/xml') return true
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return TEXT_EXTENSIONS.has(ext)
}

/** 读取文本文件内容 */
export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file, 'utf-8')
  })
}

/** 附件是否已解析出文本内容 */
export function isTextAttachment(attachment: PickedAttachment): boolean {
  return typeof attachment.content === 'string'
}

/** 人类可读的文件体积 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
