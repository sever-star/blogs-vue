import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Notification, NotificationType } from '@/types'
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/api/notification'
import { getUnreadMessageCount } from '@/api/message'

/** 通知页的分类模块（无「全部」：铃铛本体默认进第一个分类 comment） */
export const NOTIFICATION_TABS = [
  { key: 'comment', label: '评论通知' },
  { key: 'like', label: '点赞收藏' },
  { key: 'follow', label: '关注' },
  { key: 'system', label: '系统' },
] as const

export type NotificationTab = (typeof NOTIFICATION_TABS)[number]['key']

/** 各 tab 未读计数初始空表 */
function emptyTabs(): Record<string, number> {
  return { comment: 0, like: 0, follow: 0, system: 0 }
}

/** 某条通知（按原始 type）归到哪个 tab */
function tabOf(type: NotificationType): NotificationTab {
  switch (type) {
    case 'post_comment':
    case 'comment_reply':
    case 'comment_like':
      return 'comment'
    case 'like':
    case 'favorite':
      return 'like'
    case 'follow':
      return 'follow'
    case 'message':
      // 私信通知已下线，旧数据归到系统 tab 展示
      return 'system'
    default:
      return 'system'
  }
}

export const useNotificationStore = defineStore('notification', () => {
  const list = ref<Notification[]>([])
  const unreadCount = ref(0)
  /** 各分类的未读数（按 tab 聚合，由后端 byType 派生） */
  const unreadByTab = ref<Record<string, number>>(emptyTabs())
  const loading = ref(false)
  const activeTab = ref<NotificationTab>('comment')
  const total = ref(0)
  /** 当前用户私信总未读数（独立于通知系统，来自 GET /messages/unread-count） */
  const messageUnreadCount = ref(0)

  /** 进入页面 / 点开铃铛时拉一次未读数（不轮询） */
  const fetchUnreadCount = async () => {
    try {
      const res = await getUnreadCount()
      const byType = res?.byType ?? {}
      // 私信未读不进通知系统：铃铛总数与各 tab 角标都排除 message 类型
      const messageUnread = Number(byType['message']) || 0
      unreadCount.value = Math.max(0, Number(res?.count ?? 0) - messageUnread)
      const next = emptyTabs()
      for (const [type, n] of Object.entries(byType)) {
        if (type === 'message') continue
        next[tabOf(type as NotificationType)] += Number(n) || 0
      }
      unreadByTab.value = next
    } catch {
      unreadCount.value = 0
      unreadByTab.value = emptyTabs()
    }
  }

  /** 拉私信总未读数（私信未读不进通知系统，单独接口；供铃铛「私信」入口角标展示） */
  const fetchMessageUnread = async () => {
    try {
      messageUnreadCount.value = await getUnreadMessageCount()
    } catch {
      messageUnreadCount.value = 0
    }
  }

  /** 拉通知列表（按激活 tab 过滤后的前端列表） */
  const fetchList = async (page = 1, pageSize = 50) => {
    loading.value = true
    try {
      const res = await getNotifications(page, pageSize, false)
      list.value = res.data ?? []
      total.value = Number(res.total ?? 0)
    } catch (e) {
      console.error('获取通知失败:', e)
      list.value = []
    } finally {
      loading.value = false
    }
  }

  /** 当前 tab 下展示的通知（前端分组，避免为每个分类多打一个接口） */
  const visibleList = () => {
    return list.value.filter(n => tabOf(n.type) === activeTab.value)
  }

  /** 标记单条已读（成功后本地置已读 + 总数与对应 tab 各减一） */
  const markRead = async (n: Notification) => {
    if (n.isRead === 1) return
    try {
      await markNotificationRead(n.id)
      n.isRead = 1
      if (unreadCount.value > 0) unreadCount.value -= 1
      const tab = tabOf(n.type)
      if (unreadByTab.value[tab] > 0) unreadByTab.value[tab] -= 1
    } catch (e) {
      console.error('标记已读失败:', e)
    }
  }

  /** 全部标记已读 */
  const markAllRead = async () => {
    try {
      await markAllNotificationsRead()
      list.value.forEach(n => {
        n.isRead = 1
      })
      unreadCount.value = 0
      unreadByTab.value = emptyTabs()
    } catch (e) {
      console.error('全部已读失败:', e)
    }
  }

  /** 删除单条通知（type='announcement' 后端会拒绝，前端不提供入口） */
  const remove = async (id: number) => {
    try {
      await deleteNotification(id)
      const removed = list.value.find(n => n.id === id)
      list.value = list.value.filter(n => n.id !== id)
      if (removed && removed.isRead === 0) {
        if (unreadCount.value > 0) unreadCount.value -= 1
        const tab = tabOf(removed.type)
        if (unreadByTab.value[tab] > 0) unreadByTab.value[tab] -= 1
      }
    } catch (e) {
      console.error('删除通知失败:', e)
    }
  }

  /** 登出时清空，避免下个账号看到上一个的未读 */
  const clear = () => {
    list.value = []
    unreadCount.value = 0
    unreadByTab.value = emptyTabs()
    activeTab.value = 'comment'
    messageUnreadCount.value = 0
  }

  return {
    list,
    unreadCount,
    unreadByTab,
    loading,
    activeTab,
    total,
    messageUnreadCount,
    fetchUnreadCount,
    fetchMessageUnread,
    fetchList,
    visibleList,
    markRead,
    markAllRead,
    remove,
    clear,
  }
})
