import { BrowserRouter, Routes, Route } from 'react-router'
import { MoleculeProvider } from '@molecule/app-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, themeProvider, i18nProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'
import { Login } from './pages/Login.js'
import { Signup } from './pages/Signup.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Home } from './pages/Home.js'
import { About } from './pages/About.js'
import { PlanUpdated } from './pages/PlanUpdated.js'

export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/about" element={<About />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
