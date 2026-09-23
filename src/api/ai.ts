import client, { API_BASE_URL } from './client'
import { getAccessToken } from '@/utils/token'

// ============ 类型 ============

/** AI 能力状态 */
export interface AiConfig {
  /** 后端是否已配置模型 API Key */
  configured: boolean
  model: string
}

/** 会话（对话列表项） */
export interface AiSession {
  id: number
  title: string
  createdAt: string
  updatedAt: string
}

/** 消息角色 */
export type AiRole = 'user' | 'assistant'

/** 消息状态：0 生成中 / 1 已完成 / 2 失败 */
export type AiMessageStatus = 0 | 1 | 2

/** 消息明细 */
export interface AiMessage {
  id: number
  role: AiRole
  content: string
  tokens: number | null
  status: AiMessageStatus
  createdAt: string
}

/** 附件：文本类带 content，二进制类带 url */
export interface AiAttachment {
  name: string
  content?: string
  url?: string
}

/** 对话请求体 */
export interface AiChatPayload {
  /** 为空表示新建会话 */
  sessionId?: number | null
  content: string
  attachments?: AiAttachment[]
}

/** 上传附件结果 */
export interface AiUploadResult {
  url: string
  name: string
  size: number
}

// ============ 会话接口 ============

/** 查询 AI 能力状态 */
export const getAiConfig = async (): Promise<AiConfig> => {
  return client.get('/ai/config')
}

/** 会话列表 */
export const getAiSessions = async (): Promise<AiSession[]> => {
  return client.get('/ai/sessions')
}

/** 新建会话 */
export const createAiSession = async (title?: string): Promise<AiSession> => {
  return client.post('/ai/sessions', { title })
}

/** 删除会话 */
export const deleteAiSession = async (id: number): Promise<void> => {
  await client.delete(`/ai/sessions/${id}`)
}

/** 会话历史消息 */
export const getAiMessages = async (sessionId: number): Promise<AiMessage[]> => {
  return client.get(`/ai/sessions/${sessionId}/messages`)
}

/** 上传二进制附件到 OSS */
export const uploadAiAttachment = async (file: File): Promise<AiUploadResult> => {
  const formData = new FormData()
  formData.append('file', file)
  // 与上传头像同理：client 默认 application/json，不显式声明会让 axios 把 FormData 序列化成 JSON
  return client.post('/ai/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

// ============ 流式对话 ============

/** 流式回调集合 */
export interface AiStreamHandlers {
  /** 服务端确认的会话/消息 id，收到后才能把气泡挂到正确位置 */
  onMeta?: (meta: { sessionId: number; messageId: number }) => void
  /** 增量文本，会被调用多次 */
  onContent?: (delta: string) => void
  /** 生成完成，携带 token 消耗 */
  onDone?: (info: { tokens: number }) => void
}

/** 服务端主动推送的错误（生成中途失败） */
export class AiStreamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiStreamError'
  }
}

/**
 * 流式对话。
 *
 * 这里用 fetch + ReadableStream 而非 EventSource：EventSource 只支持 GET，
 * 无法携带 JSON 请求体与 Authorization 头。返回值在流结束后 resolve，
 * 中途失败（含服务端 error 事件）则 reject。
 *
 * @param payload 请求体
 * @param handlers 增量回调
 * @param signal 用于「停止生成」的中断信号
 */
export const streamAiChat = async (
  payload: AiChatPayload,
  handlers: AiStreamHandlers,
  signal?: AbortSignal
): Promise<void> => {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  })

  // 限流、参数校验、未配置 Key 等都在开始生成前返回，走统一的 JSON 错误体
  if (!response.ok) {
    throw new AiStreamError(await readErrorMessage(response))
  }
  if (!response.body) {
    throw new AiStreamError('当前浏览器不支持流式响应')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let serverError: string | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // stream: true 保证多字节字符被截断时不会解码出乱码
    buffer += decoder.decode(value, { stream: true })

    // SSE 以空行分隔事件；统一换行符，兼容 \r\n 的代理实现
    buffer = buffer.replace(/\r\n/g, '\n')
    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      const error = dispatch(chunk, handlers)
      if (error) serverError = error
      boundary = buffer.indexOf('\n\n')
    }
  }

  if (serverError) {
    throw new AiStreamError(serverError)
  }
}

/** 解析并分发一个 SSE 事件块；返回错误文案（若是 error 事件） */
function dispatch(chunk: string, handlers: AiStreamHandlers): string | null {
  let event = 'message'
  const dataLines: string[] = []

  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      // 规范允许一个事件带多行 data，需按换行拼接
      dataLines.push(line.slice(5).trimStart())
    }
  }
  if (dataLines.length === 0) return null

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(dataLines.join('\n'))
  } catch {
    return null
  }

  switch (event) {
    case 'meta':
      handlers.onMeta?.(payload as unknown as { sessionId: number; messageId: number })
      return null
    case 'content':
      handlers.onContent?.(String(payload.delta ?? ''))
      return null
    case 'done':
      handlers.onDone?.({ tokens: Number(payload.tokens ?? 0) })
      return null
    case 'error':
      return String(payload.message ?? 'AI 服务异常')
    default:
      return null
  }
}

/** 从统一响应体 { code, message } 中取出可展示的错误文案 */
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (body?.message) return body.message
  } catch {
    // 响应不是 JSON（如网关错误页），退回状态码提示
  }
  return `请求失败（HTTP ${response.status}）`
}
