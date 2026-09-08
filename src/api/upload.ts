import client from './client'

/** 头像上传返回结果 */
export interface AvatarUploadResult {
  /** OSS 公开访问 URL */
  url: string
}

/**
 * 上传头像图片到 OSS（后端中转）
 * POST /upload/avatar
 * Content-Type: multipart/form-data，字段名 `file`
 *
 * 前端把图片文件发给后端，后端用 OssUtil.uploadImage(file, "avatar") 存 OSS，
 * 返回公开 URL，前端拿到后写入 user.avatar（或随 PUT /auth/me 提交）。
 */
export const uploadAvatar = async (file: File): Promise<AvatarUploadResult> => {
  const formData = new FormData()
  formData.append('file', file)
  // 必须显式声明 multipart/form-data：client 默认是 application/json，
  // 否则 axios 会把 FormData 序列化成 JSON，后端会报「not a multipart request」。
  // boundary 由 axios/浏览器自动补齐，无需手动写。
  return client.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
