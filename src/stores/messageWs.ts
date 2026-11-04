import { defineStore } from 'pinia'
import { ElNotification } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notification'
import { refreshAccessToken } from '@/api/client'
import type { ChatMessage } from '@/api/message'

/**
 * 私信 WebSocket 连接管理。
 *
 * 协议见后端 MessagesWebSocketHandler。本 store 负责：
 *  - 生命周期：登录建立、登出断开；断线指数退避重连；握手失败（多半 token 过期）先刷新再重连。
 *  - 发送：send() 写 send 帧，等 send_ack 回执后 resolve 落库后的完整消息（含 id/createdAt）。
 *  - 接收：收到 message 帧时未读角标 +1，分发给订阅者；无人处理（不在该会话窗口）则弹通知。
 *
 * 与 REST 的关系：发送走 WS；REST POST /messages 仅作后端兜底，前端不再调用。
 * 角标未读数仍由 notifStore.messageUnreadCount 承载（GET /messages/unread-count 拉取初始值，
 * WS 收到新消息时本地 +1；标记已读后 fetchMessageUnread 从服务端校正）。
 */

/** 收到私信的监听器；返回 true 表示已处理（不弹桌面通知） */
type MessageListener = (m: ChatMessage) => boolean | void

/** WS 基址：dev 下走 vite /ws 代理（见 vite.config.ts），生产同源；可用 VITE_WS_BASE 覆盖 */
const WS_BASE =
  import.meta.env.VITE_WS_BASE ||
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`

export const useMessageWsStore = defineStore('messageWs', () => {
  const authStore = useAuthStore()
  const notifStore = useNotificationStore()

  let ws: WebSocket | null = null
  /** 本次连接是否曾成功握手；用于区分「握手被拒（token 过期）」与「正常断线」 */
  let opened = false
  let reconnectTimer: number | null = null
  let backoff = 1000
  const listeners = new Set<MessageListener>()
  /** 单飞发送：UI 的 sending 标志保证同时最多一单在途，无需 correlation id */
  let pendingSend: {
    resolve: (m: ChatMessage) => void
    reject: (e: Error) => void
    timer: number
  } | null = null

  const connect = () => {
    const token = authStore.accessToken
    if (!token) return
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    opened = false
    try {
      ws = new WebSocket(`${WS_BASE}/ws/messages?token=${encodeURIComponent(token)}`)
    } catch {
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      opened = true
      backoff = 1000
    }

    ws.onmessage = (ev) => {
      let msg: { type: string; data?: ChatMessage; code?: number; message?: string }
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      switch (msg.type) {
        case 'send_ack':
          if (pendingSend && msg.data) {
            clearTimeout(pendingSend.timer)
            pendingSend.resolve(msg.data)
            pendingSend = null
          }
          break
        case 'error':
          if (pendingSend) {
            clearTimeout(pendingSend.timer)
            pendingSend.reject(new Error(msg.message || '发送失败'))
            pendingSend = null
          }
          break
        case 'message':
          handleIncoming(msg.data as ChatMessage)
          break
        case 'ping':
        case 'pong':
          // 心跳，忽略
          break
      }
    }

    ws.onclose = () => {
      ws = null
      // 连接断开时，挂起的发送直接失败，避免 UI 卡在 sending
      failPending('连接已断开')
      if (!authStore.isLoggedIn) return
      // 握手未成功（access token 过期被拒）→ 先刷新再重连；否则正常退避重连
      if (!opened) {
        refreshAccessToken().finally(scheduleReconnect)
      } else {
        scheduleReconnect()
      }
    }

    ws.onerror = () => {
      // 统一交给 onclose 处理重连
    }
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) return
    reconnectTimer = window.setTimeout(
      () => {
        reconnectTimer = null
        backoff = Math.min(backoff * 2, 30_000)
        connect()
      },
      backoff
    )
  }

  const handleIncoming = (m: ChatMessage) => {
    if (!m) return
    notifStore.messageUnreadCount += 1
    let handled = false
    listeners.forEach((cb) => {
      try {
        if (cb(m) === true) handled = true
      } catch (e) {
        console.error('[messageWs] 消息监听器异常', e)
      }
    })
    if (!handled) {
      ElNotification({
        title: m.senderNickname || '私信',
        message: m.content,
        type: 'info',
        duration: 4000,
      })
    }
  }

  /** 订阅收到的私信；回调返回 true 表示已处理（不弹通知），返回 false/void 由本 store 弹通知 */
  const onMessage = (cb: MessageListener) => {
    listeners.add(cb)
    return () => {
      listeners.delete(cb)
    }
  }

  /** 通过 WS 发送私信，等 send_ack 回执后 resolve 落库后的完整消息 */
  const send = (payload: {
    receiverId: number
    content: string
  }): Promise<ChatMessage> => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('连接未就绪，请稍后重试'))
    }
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (pendingSend && pendingSend.resolve === resolve) {
          pendingSend.reject(new Error('发送超时'))
          pendingSend = null
        }
      }, 10_000)
      pendingSend = { resolve, reject, timer }
      ws!.send(JSON.stringify({ type: 'send', data: payload }))
    })
  }

  const failPending = (reason: string) => {
    if (pendingSend) {
      clearTimeout(pendingSend.timer)
      pendingSend.reject(new Error(reason))
      pendingSend = null
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    failPending('连接已断开')
    if (ws) {
      // 摘除回调，防止主动 close 触发 onclose 重连
      ws.onclose = null
      ws.onerror = null
      ws.onmessage = null
      try {
        ws.close()
      } catch {
        // 忽略
      }
      ws = null
    }
    backoff = 1000
  }

  return { connect, disconnect, send, onMessage }
})
