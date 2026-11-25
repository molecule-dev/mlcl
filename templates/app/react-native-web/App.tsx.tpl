import { Routes, Route } from 'react-router'
import { MoleculeProvider } from '@molecule/app-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { BrowserRouter } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, themeProvider, i18nProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'
import { Login } from './pages/Login.js'
import { Signup } from './pages/Signup.js'
import { About } from './pages/About.js'
{{#feature emails}}
import { ForgotPassword } from './pages/ForgotPassword.js'
import { ResetPassword } from './pages/ResetPassword.js'
{{/feature}}
import { Home } from './pages/Home.js'
{{#feature payments}}
import { PlanUpdated } from './pages/PlanUpdated.js'
{{/feature}}

// `awaitSession` holds every page until a returning visitor's session is restored,
// so public pages read the restored user when that request succeeds.
// 'unavailable' still renders and may have a null user; it is not sign-out. Keep it.
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        awaitSession
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/about" element={<About />} />
{{#feature emails}}
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
{{/feature}}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
{{#feature payments}}
              <Route path="/plan-updated" element={<PlanUpdated />} />
{{/feature}}
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
