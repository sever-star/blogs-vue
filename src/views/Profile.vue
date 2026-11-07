<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- 左侧：头像卡片（身份信息） -->
      <aside class="profile-sidebar">
        <div class="avatar-card">
          <el-avatar :src="user?.avatar" :size="96" class="profile-avatar">
            {{ user?.nickname?.charAt(0) || 'U' }}
          </el-avatar>
          <div class="nickname">{{ user?.nickname }}</div>
          <div class="username">@{{ user?.username }}</div>
          <div class="bio">{{ user?.bio || '这个人很懒，什么都没写~' }}</div>
          <el-divider style="margin: 16px 0" />
          <div class="stat-row">
            <span class="stat">
              <b>{{ statsLoading ? '…' : stats.articleCount }}</b>
              文章
            </span>
            <span class="stat">
              <b>{{ statsLoading ? '…' : stats.likeCount }}</b>
              获赞
            </span>
            <span class="stat">
              <b>{{ statsLoading ? '…' : stats.viewCount }}</b>
              浏览
            </span>
            <span class="stat">
              <b>{{ statsLoading ? '…' : stats.followerCount }}</b>
              粉丝
            </span>
          </div>
          <div class="member-since">
            加入于 {{ formatDate(user?.createdAt) }}
          </div>
        </div>
      </aside>

      <!-- 右侧：四个选择栏（赞过 / 收藏 / 关注 / 粉丝） -->
      <main class="profile-main">
        <el-card shadow="never" class="profile-card">
          <el-tabs v-model="activeTab" @tab-change="onTabChange">
            <el-tab-pane label="赞过的文章" name="liked">
              <!-- 加载中 -->
              <div v-if="likedLoading" class="tab-skeleton">
                <el-skeleton :rows="5" animated />
              </div>
              <!-- 加载失败 -->
              <el-empty v-else-if="likedError" :description="likedError">
                <el-button type="primary" @click="loadLiked">重试</el-button>
              </el-empty>
              <!-- 空列表 -->
              <el-empty v-else-if="likedArticles.length === 0" description="还没有赞过的文章" />
              <!-- 文章列表：复用首页 ArticleCard，点击进详情 -->
              <div v-else class="liked-list">
                <ArticleCard v-for="a in likedArticles" :key="a.id" :article="a" />
              </div>
            </el-tab-pane>
            <el-tab-pane label="收藏的文章" name="favorites">
              <el-empty description="收藏的文章会展示在这里" />
            </el-tab-pane>
            <el-tab-pane label="关注的用户" name="following">
              <div v-if="followingLoading" class="tab-skeleton">
                <el-skeleton :rows="4" animated />
              </div>
              <el-empty v-else-if="followingError" :description="followingError">
                <el-button type="primary" @click="loadFollowing">重试</el-button>
              </el-empty>
              <el-empty v-else-if="followingUsers.length === 0" description="还没有关注的用户" />
              <div v-else class="following-list">
                <div v-for="u in followingUsers" :key="u.id" class="following-row">
                  <el-avatar :src="u.avatar || undefined" :size="44">
                    {{ (u.nickname || u.username || '?').charAt(0) }}
                  </el-avatar>
                  <div class="following-info">
                    <span class="following-nickname">{{ u.nickname || u.username }}</span>
                    <span class="following-username">@{{ u.username }}</span>
                    <span v-if="u.bio" class="following-bio">{{ u.bio }}</span>
                  </div>
                  <div v-if="!isSelf(u)" class="following-actions">
                    <el-button
                      size="small"
                      :type="followOf(u).followed ? 'info' : 'primary'"
                      :plain="!followOf(u).followed"
                      :loading="followOf(u).loading"
                      @click="toggleFollow(u)"
                    >
                      {{ followOf(u).followed ? '已关注' : '关注' }}
                    </el-button>
                    <el-button size="small" plain @click="handleMessage(u)">私信</el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="我的粉丝" name="followers">
              <div v-if="followersLoading" class="tab-skeleton">
                <el-skeleton :rows="4" animated />
              </div>
              <el-empty v-else-if="followersError" :description="followersError">
                <el-button type="primary" @click="loadFollowers">重试</el-button>
              </el-empty>
              <el-empty v-else-if="followerUsers.length === 0" description="还没有粉丝" />
              <div v-else class="following-list">
                <div v-for="u in followerUsers" :key="u.id" class="following-row">
                  <el-avatar :src="u.avatar || undefined" :size="44">
                    {{ (u.nickname || u.username || '?').charAt(0) }}
                  </el-avatar>
                  <div class="following-info">
                    <span class="following-nickname">{{ u.nickname || u.username }}</span>
                    <span class="following-username">@{{ u.username }}</span>
                    <span v-if="u.bio" class="following-bio">{{ u.bio }}</span>
                  </div>
                  <div v-if="!isSelf(u)" class="following-actions">
                    <el-button
                      size="small"
                      :type="followOf(u).followed ? 'info' : 'primary'"
                      :plain="!followOf(u).followed"
                      :loading="followOf(u).loading"
                      @click="toggleFollow(u)"
                    >
                      {{ followOf(u).followed ? '已关注' : '关注' }}
                    </el-button>
                    <el-button size="small" plain @click="handleMessage(u)">私信</el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getLikedArticles } from '@/api/article'
import { getFollowing, getFollowers, followUser, unfollowUser, getFollowStatus } from '@/api/follow'
import { getUserStats, type UserStats } from '@/api/user'
import type { ArticleListItem, User } from '@/types'
import ArticleCard from '@/components/ArticleCard.vue'

const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

// ---- 主页统计：文章 / 获赞 / 粉丝 ----
const stats = ref<UserStats>({ articleCount: 0, likeCount: 0, followerCount: 0 })
const statsLoading = ref(false)

async function loadStats() {
  if (!user.value?.id) return
  statsLoading.value = true
  try {
    stats.value = await getUserStats(user.value.id)
  } catch {
    // 统计失败不阻断页面，保持 0 占位
  } finally {
    statsLoading.value = false
  }
}

// 四个选择栏：赞过 / 收藏 / 关注 / 粉丝
const activeTab = ref<'liked' | 'favorites' | 'following' | 'followers'>('liked')

// ---- 赞过的文章 ----
const likedArticles = ref<ArticleListItem[]>([])
const likedLoading = ref(false)
const likedError = ref('')
const likedLoaded = ref(false)

async function loadLiked() {
  likedLoading.value = true
  likedError.value = ''
  try {
    likedArticles.value = await getLikedArticles()
    likedLoaded.value = true
  } catch (e: any) {
    likedError.value = e?.message || '加载失败，请稍后重试'
    ElMessage.error(likedError.value)
  } finally {
    likedLoading.value = false
  }
}

/** 切换 tab 时懒加载（仅首次）；「收藏的文章」接口待实现 */
function onTabChange(name: string | number) {
  if (name === 'liked' && !likedLoaded.value && !likedLoading.value) {
    loadLiked()
  }
  if (name === 'following' && !followingLoaded.value && !followingLoading.value) {
    loadFollowing()
  }
  if (name === 'followers' && !followersLoaded.value && !followersLoading.value) {
    loadFollowers()
  }
}

// ---- 关注的用户 ----
const followingUsers = ref<User[]>([])
const followingLoading = ref(false)
const followingError = ref('')
const followingLoaded = ref(false)

async function loadFollowing() {
  followingLoading.value = true
  followingError.value = ''
  try {
    const list = await getFollowing()
    followingUsers.value = list
    // 关注列表里的都是当前用户已关注的人，直接置为已关注
    list.forEach((u) => {
      followOf(u).followed = true
    })
    followingLoaded.value = true
  } catch (e: any) {
    followingError.value = e?.message || '加载失败，请稍后重试'
    ElMessage.error(followingError.value)
  } finally {
    followingLoading.value = false
  }
}

// ---- 我的粉丝 ----
const followerUsers = ref<User[]>([])
const followersLoading = ref(false)
const followersError = ref('')
const followersLoaded = ref(false)

async function loadFollowers() {
  if (!user.value?.id) return
  followersLoading.value = true
  followersError.value = ''
  try {
    const list = await getFollowers(user.value.id)
    followerUsers.value = list
    followersLoaded.value = true
    // 粉丝列表关注状态未知：对非自己的每个粉丝并发查一次关注状态
    list.forEach((u) => {
      if (isSelf(u)) return
      // 先初始化为未关注，避免按钮闪烁
      followOf(u).followed = false
      getFollowStatus(u.id)
        .then((ok) => {
          followOf(u).followed = ok
        })
        .catch(() => {
          // 状态查询失败不打扰用户，按钮保持「关注」
        })
    })
  } catch (e: any) {
    followersError.value = e?.message || '加载失败，请稍后重试'
    ElMessage.error(followersError.value)
  } finally {
    followersLoading.value = false
  }
}

// ---- 列表行内：关注 / 私信 ----
// 每个用户的关注按钮状态：followed=是否已关注，loading=操作中
const followState = reactive<Record<number, { followed: boolean; loading: boolean }>>({})

/** 取/初始化某用户的关注状态对象（reactive，模板可直接读） */
function followOf(u: User): { followed: boolean; loading: boolean } {
  if (!followState[u.id]) {
    followState[u.id] = { followed: false, loading: false }
  }
  return followState[u.id]
}

/** 是否是当前登录用户自己（自己不展示关注/私信按钮） */
function isSelf(u: User): boolean {
  return u.id === user.value?.id
}

/** 切换关注/取消关注 */
async function toggleFollow(u: User) {
  if (!authStore.isLoggedIn) {
    authStore.openLoginModal('login')
    return
  }
  if (isSelf(u)) return
  const st = followOf(u)
  st.loading = true
  try {
    if (st.followed) {
      await unfollowUser(u.id)
      st.followed = false
      ElMessage.success('已取消关注')
    } else {
      await followUser(u.id)
      st.followed = true
      ElMessage.success('已关注')
    }
  } catch (error) {
    ElMessage.error(errorText(error, st.followed ? '取消关注失败' : '关注失败'))
  } finally {
    st.loading = false
  }
}

/** 发起私信：带 userId + 昵称 + 头像进入私信页草稿态，首条消息发送时才创建会话 */
function handleMessage(u: User) {
  if (!authStore.isLoggedIn) {
    authStore.openLoginModal('login')
    return
  }
  if (isSelf(u)) return
  router.push({
    path: '/messages',
    query: {
      userId: u.id,
      nick: u.nickname || u.username || '',
      avatar: u.avatar || '',
    },
  })
}

function errorText(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '')
    if (message) return message
  }
  if (typeof error === 'string' && error) return error
  return fallback
}

function formatDate(date?: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })
}

// 未登录时不允许进入（路由守卫兜底）；已登录则默认进「赞过的文章」直接拉取
onMounted(() => {
  if (!authStore.isLoggedIn) {
    router.replace('/')
    return
  }
  loadLiked()
  loadStats()
})
</script>

<style scoped>
.profile-page {
  min-height: calc(100vh - 70px);
  background-color: #f6f7f9;
  padding: 24px 0;
}

.profile-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 0 20px;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 24px;
  align-items: start;
}

/* 左侧头像卡片 */
.avatar-card {
  background: #fff;
  border-radius: 12px;
  padding: 32px 24px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.profile-avatar {
  display: block;
  margin: 0 auto;
}

.nickname {
  margin-top: 16px;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}

.username {
  margin-top: 4px;
  font-size: 14px;
  color: #9ca3af;
}

.bio {
  margin-top: 12px;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.6;
  min-height: 20px;
}

.stat-row {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  color: #9ca3af;
}

.stat b {
  font-size: 16px;
  color: #1f2937;
}

.member-since {
  margin-top: 16px;
  font-size: 12px;
  color: #b0b6c0;
}

/* 右侧选择栏卡片 */
.profile-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* 赞过的文章列表：ArticleCard 自带卡片间距与底色，外层只补内边距 */
.liked-list {
  padding: 4px 0 8px;
}

.tab-skeleton {
  padding: 20px 8px;
}

/* 关注的用户列表 */
.following-list {
  display: flex;
  flex-direction: column;
}

.following-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 4px;
  border-bottom: 1px solid #f0f0f0;
}

.following-row:last-child {
  border-bottom: none;
}

.following-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

/* 关注/私信按钮行：贴行右缘，两枚紧凑按钮 */
.following-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}

.following-nickname {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.following-username {
  font-size: 12px;
  color: #9ca3af;
}

.following-bio {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .profile-container {
    grid-template-columns: 1fr;
  }
}
</style>
