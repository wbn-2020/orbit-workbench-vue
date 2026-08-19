import { createPinia } from 'pinia'
import { createApp } from 'vue'

import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'

import App from './App.vue'
import { initializeCsrf, setUnauthorizedHandler } from './api/http'
import router from './router'
import { useAuthStore } from './stores/auth'
import './styles/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhCn })

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
