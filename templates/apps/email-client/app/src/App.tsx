import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Compose = lazyPage(() => import('./pages/Compose.js').then((m) => ({ default: m.Compose })))
const Drafts = lazyPage(() => import('./pages/Drafts.js').then((m) => ({ default: m.Drafts })))
const Archive = lazyPage(() =>
  import('./pages/FolderView.js').then((m) => ({ default: m.Archive })),
)
const Sent = lazyPage(() => import('./pages/FolderView.js').then((m) => ({ default: m.Sent })))
const Spam = lazyPage(() => import('./pages/FolderView.js').then((m) => ({ default: m.Spam })))
const Trash = lazyPage(() => import('./pages/FolderView.js').then((m) => ({ default: m.Trash })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazyPage(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Inbox = lazyPage(() => import('./pages/Inbox.js').then((m) => ({ default: m.Inbox })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Starred = lazyPage(() => import('./pages/Starred.js').then((m) => ({ default: m.Starred })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ThreadView = lazyPage(() =>
  import('./pages/ThreadView.js').then((m) => ({ default: m.ThreadView })),
)
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route element={<AuthGuard />}>
                <Route path="/inbox" element={<Inbox />} />
                <Route path="/compose" element={<Compose />} />
                <Route path="/thread/:id" element={<ThreadView />} />
                <Route path="/drafts" element={<Drafts />} />
                <Route path="/starred" element={<Starred />} />
                <Route path="/sent" element={<Sent />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/trash" element={<Trash />} />
                <Route path="/spam" element={<Spam />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
