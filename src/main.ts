import { createPinia } from 'pinia'
import { createApp } from 'vue'

import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import { initializeCsrf, setUnauthorizedHandler } from './api/http'
import router from './router'
import { useAuthStore } from './stores/auth'
import { useUiStore } from './stores/ui'
import './styles/index.css'
import './styles/proto.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)

useUiStore().init()
document.body.classList.add('ow-proto')

let redirectingToLogin = false
setUnauthorizedHandler(() => {
  const auth = useAuthStore()
  auth.invalidateUser()
  if (redirectingToLogin || router.currentRoute.value.name === 'login') return
  redirectingToLogin = true
  void router
    .replace({
      name: 'login',
      query: { redirect: router.currentRoute.value.fullPath },
    })
    .finally(() => {
      redirectingToLogin = false
    })
})

initializeCsrf()
  .catch(() => undefined)
  .finally(() => app.mount('#app'))
