import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { MoleculeProvider } from '@molecule/app-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { authClient, themeProvider, i18nProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { AppLayout } from './components/AppLayout.js'

// Route-level code splitting: every page is its own chunk, so a full page load
// downloads the framework plus only the page it shows — not every page in the
// app. A page added below must be `lazy()`d the same way; a static import pulls
// its whole tree (components, their bonds, translations) back into the entry
// bundle and undoes the split for every route.
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)

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
        <Suspense fallback={null}>
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
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
