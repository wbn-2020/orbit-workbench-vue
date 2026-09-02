<template>
  <main class="auth-page">
    <DreamyBackground />
    <section class="auth-panel">
      <div class="auth-logo" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="64" height="64">
          <rect x="3" y="3" width="26" height="26" rx="7" fill="#3a6fd0" stroke="#fff" stroke-width="1.5" />
          <path d="M16 6c-3 3-3 6 0 9 3-3 3-6 0-9z" fill="#eaa11f" stroke="#fff" stroke-width="1.5" />
          <path d="M16 15v11M11 21l5 5 5-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" />
        </svg>
      </div>
      <h1>求职成长岛</h1>
      <p class="auth-sub">Java + AI 求职成长工作台</p>

      <ErrorState v-if="error" :message="error" />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="submit"
      >
        <el-form-item label="账号" prop="username">
          <el-input v-model.trim="form.username" autocomplete="username" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="current-password"
            placeholder="请输入密码"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button
          class="submit-button"
          type="primary"
          native-type="submit"
          :loading="auth.loading"
        >
          进入工作台
        </el-button>
      </el-form>

      <p class="auth-demo">
        登录需要本地后端服务 ·
        <RouterLink to="/setup">还没有账号？走首次初始化，创建第一个账号 →</RouterLink>
      </p>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import DreamyBackground from '@/components/DreamyBackground.vue'
import ErrorState from '@/components/ErrorState.vue'
import { problemMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const formRef = ref<FormInstance>()
const error = ref(route.query.expired ? '会话已过期，请重新登录。' : '')
const form = reactive({ username: '', password: '' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function submit(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return
  error.value = ''
  try {
    await auth.login(form.username, form.password)
    form.password = ''
    const redirect =
      typeof route.query.redirect === 'string' ? route.query.redirect : '/workbench'
    await router.replace(redirect)
  } catch (submitError) {
    error.value = problemMessage(submitError)
    form.password = ''
  }
}
</script>

<style scoped>
.auth-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 20px;
  overflow: hidden;
  background: var(--login-bg);
}

.auth-panel {
  position: relative;
  z-index: 1;
  width: min(400px, 100%);
  padding: 36px;
  text-align: center;
  background: var(--login-panel);
  border: 1px solid var(--glass-border);
  border-radius: 24px;
  box-shadow: var(--shadow-lg), 0 0 50px var(--card-glow);
  backdrop-filter: blur(18px) saturate(130%);
}

.auth-logo {
  margin-bottom: 14px;
  filter: drop-shadow(0 6px 14px rgb(58 123 212 / 35%));
}

h1 {
  margin: 0 0 4px;
  color: var(--ink);
  font-size: 23px;
  font-weight: 800;
}

.auth-sub {
  margin: 0 0 22px;
  color: var(--muted);
  font-size: 13px;
}

.submit-button {
  width: 100%;
  margin-top: 6px;
}

.auth-demo {
  margin: 14px 0 0;
  color: var(--faint);
  font-size: 12px;
}

.auth-demo a {
  color: var(--brand);
  font-weight: 700;
}

.auth-demo a:hover {
  text-decoration: underline;
}

@media (max-width: 600px) {
  .auth-panel {
    padding: 26px 20px;
  }
}
</style>
