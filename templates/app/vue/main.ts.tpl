import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { setupProviders } from './bonds/index.js'
import './index.css'
import './theme.css'
import { moleculePlugin } from '@molecule/app-vue'
import { getClient as getHttpClient } from '@molecule/app-http'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { registerPWA } from './pwa.js'
import App from './App.vue'
import Login from './pages/Login.vue'
import Signup from './pages/Signup.vue'
import About from './pages/About.vue'
import ForgotPassword from './pages/ForgotPassword.vue'
import ResetPassword from './pages/ResetPassword.vue'
import Home from './pages/Home.vue'
import PlanUpdated from './pages/PlanUpdated.vue'
import AuthGuard from './components/AuthGuard.vue'
import AppLayout from './components/AppLayout.vue'

setupProviders()

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: Login },
    { path: '/signup', component: Signup },
    { path: '/about', component: About },
    { path: '/forgot-password', component: ForgotPassword },
    { path: '/reset-password', component: ResetPassword },
    {
      path: '/',
      component: AuthGuard,
      children: [
        {
          path: '',
          component: AppLayout,
          children: [
            { path: '', component: Home },
            { path: 'plan-updated', component: PlanUpdated },
          ],
        },
      ],
    },
  ],
})

const app = createApp(App)

app.use(moleculePlugin, {
  auth: authClient,
  i18n: i18nProvider,
  theme: themeProvider,
  http: getHttpClient(),
  storage: getStorageProvider(),
})

app.use(router)

authClient.initialize().catch(() => {})

app.mount('#root')

registerPWA()
