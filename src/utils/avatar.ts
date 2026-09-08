/**
 * 头像工具
 *
 * 头像分两种来源：
 * 1. 用户主动上传的照片 —— 由后端上传到 OSS，`avatar` 字段保存 OSS 公开 URL；
 * 2. 未设置头像 —— 前端从 DEFAULT_AVATARS 中随机取一张默认头像，保证界面始终有头像。
 */

/**
 * 默认头像列表（前端维护，用户未上传头像时从中随机取一张）。
 *
 * 当前用 DiceBear 多风格 URL 开箱即用；若希望默认头像也完全托管到自己的 OSS，
 * 只需先把几张默认头像图上传到 OSS，再把下面的 URL 替换为对应公开 URL 即可。
 */
export const DEFAULT_AVATARS: string[] = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=avatar-01',
  'https://api.dicebear.com/7.x/bottts/svg?seed=avatar-02',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar-03',
  'https://api.dicebear.com/7.x/notionists/svg?seed=avatar-04',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=avatar-05',
  'https://api.dicebear.com/7.x/pixel-art/svg?seed=avatar-06',
]

/** 随机返回一张默认头像 URL（注册时用，注册后即持久化到后端 avatar 字段） */
export function randomAvatar(): string {
  return DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
}

/** 字符串哈希（非负），用于把 username 稳定映射到某一张默认头像 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash
}

/**
 * 根据 seed 稳定地从默认头像列表里取一张：同一个 seed 永远返回同一张。
 * 用于「用户没有头像」时的兜底，保证每次登录头像不变。
 */
export function defaultAvatar(seed: string): string {
  return DEFAULT_AVATARS[hashCode(seed) % DEFAULT_AVATARS.length]
}

/** 判断一个头像 URL 是否为空 / 未设置 */
export function hasAvatar(avatar?: string | null): boolean {
  return !!avatar && avatar.trim().length > 0
}
