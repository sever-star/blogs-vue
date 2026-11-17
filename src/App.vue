<template>
  <div class="app">
    <!-- 沉浸式海洋背景：多层潮汐波浪（固定底层，不挡交互/不干扰阅读） -->
    <div class="ocean-layer" aria-hidden="true">
      <div class="wave wave-deep"></div>
      <div class="wave wave-mid"></div>
      <div class="wave wave-near"></div>
      <div class="wave wave-foam"></div>
    </div>

    <div class="app-content">
      <Header />
      <div class="app-main">
        <router-view />
      </div>
      <Footer />
      <LoginModal v-if="showLoginModal" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import Header from '@/components/Header.vue'
import Footer from '@/components/Footer.vue'
import LoginModal from '@/components/LoginModal.vue'

const authStore = useAuthStore()
const showLoginModal = computed(() => authStore.showLoginModal)
</script>

<style scoped>
.app {
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
    'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
}

.app-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  /* 背景交给 body / 海洋层 */
  background-color: transparent;
}

.app-main {
  flex: 1;
}

/* ============================================================
   沉浸式海洋背景：四层潮汐波浪
   - 每层是无缝波浪横条，横向循环漂移表达「潮水涌动」
   - 多层垂直位置 + 不同速度 + 垂直呼吸起伏 → 景深感
   - 低饱和/低对比，卡片白底盖在上方，不干扰阅读
   ============================================================ */
.ocean-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: var(--island-bg);
}

.wave {
  position: absolute;
  left: 0;
  width: 100%;
  /* 条形高度，SVG 纵向缩放由 height 控制 */
  height: 160px;
  background-repeat: repeat-x;
  background-size: 240px 100%;
  /* 横向涌动：位移到图案一个周期，无缝循环 */
  animation: wave-drift 18s linear infinite;
}

/* 各层垂直分布：后景(顶部远处海面) → 前景(底部近处浪花)
   视觉叙事：海从页面上方延伸，一层一层涌向底部沙滩 */
.wave-deep {
  top: -40px;
  height: 200px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='40' viewBox='0 0 240 40'%3E%3Cpath fill='%230ea5e9' fill-opacity='0.55' d='M0 22 C10 10 20 10 30 22 S50 34 60 22 S80 10 90 22 S110 34 120 22 S140 10 150 22 S170 34 180 22 S200 10 210 22 S230 34 240 22 V40 H0 Z'/%3E%3C/svg%3E");
  transform-origin: left center;
  animation-duration: 26s;
}

.wave-mid {
  top: 120px;
  height: 150px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='40' viewBox='0 0 240 40'%3E%3Cpath fill='%2314b8a6' fill-opacity='0.35' d='M0 20 C15 8 30 8 45 20 S75 32 90 20 S120 8 135 20 S165 32 180 20 S210 8 225 20 S245 32 240 20 V40 H0 Z'/%3E%3C/svg%3E");
  transform-origin: left center;
  animation-duration: 22s;
  animation-delay: -8s;
}

.wave-near {
  top: 300px;
  height: 170px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='40' viewBox='0 0 240 40'%3E%3Cpath fill='%2337a7a3' fill-opacity='0.28' d='M0 24 C8 12 16 12 24 24 S40 36 48 24 S64 12 72 24 S88 36 96 24 S112 12 120 24 S136 36 144 24 S160 12 168 24 S184 36 192 24 S208 12 216 24 S232 36 240 24 V40 H0 Z'/%3E%3C/svg%3E");
  transform-origin: left center;
  animation-duration: 19s;
  animation-delay: -4s;
}

/* 最前景：细碎浪花线（白泡沫），节奏最快，最贴近"沙滩边" */
.wave-foam {
  top: 500px;
  height: 60px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='24' viewBox='0 0 240 24'%3E%3Cpath fill='none' stroke='%23ffffff' stroke-opacity='0.7' stroke-width='2' stroke-linecap='round' d='M0 12 C12 4 24 4 36 12 S60 20 72 12 S96 4 108 12 S132 20 144 12 S168 4 180 12 S204 20 216 12 S232 4 240 12'/%3E%3C/svg%3E");
  background-size: 240px auto;
  transform-origin: left center;
  animation-duration: 13s;
  animation-delay: -2s;
}

/* 潮水涌动：X 匀速向右流失（每 15% -36px，合一个 240px 周期无缝），
   Y 缓慢起伏（-10px 上涌 → 回落），同一关键帧合成两轴，各层错开 duration/delay */
@keyframes wave-drift {
  0% { transform: translate(0, 0); }
  15% { transform: translate(-36px, -9px); }
  30% { transform: translate(-72px, -2px); }
  45% { transform: translate(-108px, 7px); }
  60% { transform: translate(-144px, 10px); }
  75% { transform: translate(-180px, 6px); }
  90% { transform: translate(-216px, -3px); }
  100% { transform: translate(-240px, 0); }
}

.ocean-layer::after {
  /* 前景淡淡沙滩阴影，让波浪"拍"在沙滩上的衔接更自然 */
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 180px;
  background: linear-gradient(180deg, transparent, rgba(255, 249, 240, 0.55));
}

/* 用户偏好减少动画时关闭波动，保留静态渐变背景 */
@media (prefers-reduced-motion: reduce) {
  .ocean-layer .wave {
    animation: none;
  }
}
</style>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100%;
  height: 100%;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  cursor: pointer;
}

input,
textarea,
select {
  font-family: inherit;
}
</style>
