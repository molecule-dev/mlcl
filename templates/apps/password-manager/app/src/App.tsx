import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PasswordManagerLayout } from './components/PasswordManagerLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Generator = lazy(() => import('./pages/Generator.js').then((m) => ({ default: m.Generator })))
const ItemDetail = lazy(() =>
  import('./pages/ItemDetail.js').then((m) => ({ default: m.ItemDetail })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewItem = lazy(() => import('./pages/NewItem.js').then((m) => ({ default: m.NewItem })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SecurityReport = lazy(() =>
  import('./pages/SecurityReport.js').then((m) => ({ default: m.SecurityReport })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const SharedVaultDetail = lazy(() =>
  import('./pages/SharedVaultDetail.js').then((m) => ({ default: m.SharedVaultDetail })),
)
const SharedVaults = lazy(() =>
  import('./pages/SharedVaults.js').then((m) => ({ default: m.SharedVaults })),
)
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Trash = lazy(() => import('./pages/Trash.js').then((m) => ({ default: m.Trash })))
const Vault = lazy(() => import('./pages/Vault.js').then((m) => ({ default: m.Vault })))

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
        <AnalyticsRouteListener />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route element={<AuthGuard />}>
              <Route element={<PasswordManagerLayout />}>
                <Route path="/vault" element={<Vault />} />
                <Route path="/vault/new" element={<NewItem />} />
                <Route path="/vault/:id" element={<ItemDetail />} />
                <Route path="/generator" element={<Generator />} />
                <Route path="/shared" element={<SharedVaults />} />
                <Route path="/shared/:id" element={<SharedVaultDetail />} />
                <Route path="/security" element={<SecurityReport />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
