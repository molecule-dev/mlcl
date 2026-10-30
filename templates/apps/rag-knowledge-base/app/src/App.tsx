import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EngramLayout } from './components/EngramLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazy(() => import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })))
const Ask = lazy(() => import('./pages/Ask.js').then((m) => ({ default: m.Ask })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const DocumentDetail = lazy(() =>
  import('./pages/DocumentDetail.js').then((m) => ({ default: m.DocumentDetail })),
)
const Documents = lazy(() => import('./pages/Documents.js').then((m) => ({ default: m.Documents })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const History = lazy(() => import('./pages/History.js').then((m) => ({ default: m.History })))
const KnowledgeGraph = lazy(() =>
  import('./pages/KnowledgeGraph.js').then((m) => ({ default: m.KnowledgeGraph })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Members = lazy(() => import('./pages/Members.js').then((m) => ({ default: m.Members })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SourceDetail = lazy(() =>
  import('./pages/SourceDetail.js').then((m) => ({ default: m.SourceDetail })),
)
const Sources = lazy(() => import('./pages/Sources.js').then((m) => ({ default: m.Sources })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

export function App() {
  return (
    <BrowserRouter
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
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
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AuthGuard />}>
                <Route element={<EngramLayout />}>
                  <Route path="/ask" element={<Ask />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/documents/:id" element={<DocumentDetail />} />
                  <Route path="/sources" element={<Sources />} />
                  <Route path="/sources/:id" element={<SourceDetail />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/graph" element={<KnowledgeGraph />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
