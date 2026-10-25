import { BrowserRouter, Routes, Route } from 'react-router'
import { MoleculeProvider } from '@molecule/app-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, themeProvider, i18nProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Home } from './pages/Home.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'

// Pages are imported STATICALLY, and that is a measured decision, not an
// oversight. Route-level splitting was tried here and made this scaffold
// slower: every page is small (the whole page set is ~165 KB of source, about
// 45 KB gzip), while a `lazy()` page costs a serial chunk request after the
// entry executes, and — when that chunk resolves after React has already
// committed the Suspense fallback — React then holds the commit until
// `globalMostRecentFallbackTime + 300 ms` (SUSPENSE_FALLBACK_THROTTLE in
// react-dom). Measured with 150 ms added latency per request: 10-sample cold
// TTI 402 → 688 ms, warm navigation 372 → 512 ms, 5 → 18 requests. A full
// document load can land on ANY route here (a deep link, or a session restored
// from storage by `authClient.initialize()`), so no page can be moved off the
// first-paint path safely. Keep new routes static too. The weight that does
// leave the entry — 79 companion locale dictionaries, the analytics SDK, the
// service worker's precache — is the part with a measured gain; see the
// `UserMenu` drawer for the one interaction-only split that is still worth it.
export function App() {
  return (
    <BrowserRouter useTransitions={false}>
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
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
