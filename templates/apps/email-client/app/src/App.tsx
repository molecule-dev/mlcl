import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Compose = lazy(() => import('./pages/Compose.js').then((m) => ({ default: m.Compose })))
const Drafts = lazy(() => import('./pages/Drafts.js').then((m) => ({ default: m.Drafts })))
const Archive = lazy(() => import('./pages/FolderView.js').then((m) => ({ default: m.Archive })))
const Sent = lazy(() => import('./pages/FolderView.js').then((m) => ({ default: m.Sent })))
const Spam = lazy(() => import('./pages/FolderView.js').then((m) => ({ default: m.Spam })))
const Trash = lazy(() => import('./pages/FolderView.js').then((m) => ({ default: m.Trash })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Inbox = lazy(() => import('./pages/Inbox.js').then((m) => ({ default: m.Inbox })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Starred = lazy(() => import('./pages/Starred.js').then((m) => ({ default: m.Starred })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ThreadView = lazy(() =>
  import('./pages/ThreadView.js').then((m) => ({ default: m.ThreadView })),
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
