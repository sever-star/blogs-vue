<template>
  <footer class="site-footer">
    <div class="footer-container">
      <div class="footer-brand">
        <span class="brand-name">个人博客</span>
        <span class="brand-slogan">记录学习与思考</span>
      </div>

      <nav class="footer-links">
        <a href="#" class="footer-link">关于</a>
        <a href="#" class="footer-link">归档</a>
        <a href="#" class="footer-link">GitHub</a>
        <a href="#" class="footer-link">RSS</a>
      </nav>

      <div class="footer-copyright">
        © {{ year }} 个人博客 · Powered by Vue 3
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<style scoped>
.site-footer {
  background-color: #fff;
  border-top: 1px solid #e5e7eb;
  margin-top: 40px;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #3b82f6, #9333ea);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-slogan {
  font-size: 13px;
  color: #9ca3af;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
}

.footer-link {
  font-size: 14px;
  color: #4b5563;
  transition: color 0.3s;
}

.footer-link:hover {
  color: #3b82f6;
}

.footer-copyright {
  font-size: 12px;
  color: #9ca3af;
}

@media (max-width: 768px) {
  .footer-container {
    padding: 20px 12px;
  }
}
</style>
