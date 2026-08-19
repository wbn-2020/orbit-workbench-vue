import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  getCurrentUser,
  getSetupStatus,
  login as loginRequest,
  logout as logoutRequest,
  setupAccount,
} from '@/api/auth'
import { getProblem } from '@/api/http'
import type { CurrentUser } from '@/types/api'

export const useAuthStore = defineStore('auth', () => {
  const initialized = ref<boolean | null>(null)
  const user = ref<CurrentUser | null>(null)
  const setupChecked = ref(false)
  const userChecked = ref(false)
  const loading = ref(false)

  const authenticated = computed(() => Boolean(user.value))

  async function ensureSetupStatus(force = false): Promise<boolean> {
    if (setupChecked.value && !force && initialized.value !== null) {
      return initialized.value
    }

    const status = await getSetupStatus()
    initialized.value = status.initialized
    setupChecked.value = true
    return status.initialized
  }

  async function ensureUser(force = false): Promise<CurrentUser | null> {
    if (userChecked.value && !force) return user.value
    try {
      user.value = await getCurrentUser()
    } catch (error) {
      const problem = getProblem(error)
      if (problem.status !== 401) throw error
      user.value = null
    } finally {
      userChecked.value = true
    }
    return user.value
  }

  async function setup(username: string, password: string): Promise<void> {
    loading.value = true
    try {
      await setupAccount({ username, password })
      initialized.value = true
      setupChecked.value = true
      user.value = null
      userChecked.value = false
    } finally {
      loading.value = false
    }
  }

  async function login(username: string, password: string): Promise<void> {
    loading.value = true
    try {
      const responseUser = await loginRequest({ username, password })
      user.value = responseUser ?? (await getCurrentUser())
      userChecked.value = true
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    loading.value = true
    try {
      await logoutRequest()
    } finally {
      user.value = null
      userChecked.value = true
      loading.value = false
    }
  }

  function invalidateUser(): void {
    user.value = null
    userChecked.value = false
  }

  return {
    initialized,
    user,
    loading,
    authenticated,
    ensureSetupStatus,
    ensureUser,
    setup,
    login,
    logout,
    invalidateUser,
  }
})
