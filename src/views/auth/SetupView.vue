<template>
  <main class="auth-page">
    <section class="auth-panel">
      <div class="auth-brand">
        <span class="brand-mark">O</span>
        <div>
          <strong>Orbit Workbench</strong>
          <span>首次初始化</span>
        </div>
      </div>

      <div class="auth-heading">
        <h1>创建本地账号</h1>
        <p>此账号仅用于当前工作台。</p>
      </div>

      <ErrorState v-if="error" :message="error" />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        size="large"
        @submit.prevent="submit"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model.trim="form.username" autocomplete="username" autofocus />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            @keyup.enter="submit"
          />
        </el-form-item>
        <el-button
          class="submit-button"
          type="primary"
          native-type="submit"
          :loading="auth.loading"
        >
          创建账号
        </el-button>
      </el-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import ErrorState from '@/components/ErrorState.vue'
import { problemMessage } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref<FormInstance>()
const error = ref('')
const form = reactive({ username: '', password: '', confirmPassword: '' })

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 32, message: '用户名长度为 3-32 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    {
      validator: (_rule, value: string, callback) => {
        if (!value) callback(new Error('请再次输入密码'))
        else if (value !== form.password) callback(new Error('两次输入的密码不一致'))
        else callback()
      },
      trigger: 'blur',
    },
  ],
}

async function submit(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return
  error.value = ''
  try {
    await auth.setup(form.username, form.password)
    clearPasswords()
    await router.replace('/login')
  } catch (submitError) {
    clearPasswords()
    error.value = problemMessage(submitError)
  }
}

function clearPasswords(): void {
  form.password = ''
  form.confirmPassword = ''
}

onBeforeUnmount(clearPasswords)
</script>

<style scoped>
.auth-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: var(--ow-bg);
}

.auth-panel {
  width: min(430px, 100%);
  padding: 30px;
  background: var(--ow-surface);
  border: 1px solid var(--ow-line);
  border-radius: var(--ow-radius);
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--ow-line-soft);
}

.brand-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--ow-primary-ink);
  background: var(--ow-primary);
  border-radius: 7px;
  font-weight: 800;
}

.auth-brand > div {
  display: grid;
}

.auth-brand span:last-child {
  color: var(--ow-muted);
  font-size: 11px;
}

.auth-heading {
  margin: 26px 0 22px;
}

.auth-heading h1 {
  margin-bottom: 6px;
  font-size: 22px;
}

.auth-heading p {
  margin: 0;
  color: var(--ow-muted);
}

.error-state {
  margin-bottom: 18px;
}

.submit-button {
  width: 100%;
  margin-top: 6px;
}

@media (max-width: 600px) {
  .auth-page {
    display: block;
    padding: 0;
    background: var(--ow-bg);
  }

  .auth-panel {
    width: 100%;
    min-height: 100vh;
    padding: 26px 20px;
    border: 0;
  }
}
</style>
