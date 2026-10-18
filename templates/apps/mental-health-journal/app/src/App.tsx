import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { MentalHealthJournalLayout } from './components/MentalHealthJournalLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Calendar = lazy(() => import('./pages/Calendar.js').then((m) => ({ default: m.Calendar })))
const EntryComposer = lazy(() =>
  import('./pages/EntryComposer.js').then((m) => ({ default: m.EntryComposer })),
)
const EntryDetail = lazy(() =>
  import('./pages/EntryDetail.js').then((m) => ({ default: m.EntryDetail })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazy(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Insights = lazy(() => import('./pages/Insights.js').then((m) => ({ default: m.Insights })))
const Journal = lazy(() => import('./pages/Journal.js').then((m) => ({ default: m.Journal })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Prompts = lazy(() => import('./pages/Prompts.js').then((m) => ({ default: m.Prompts })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AuthGuard />}>
                <Route element={<MentalHealthJournalLayout />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/journal" element={<Journal />} />
                  <Route path="/journal/new" element={<EntryComposer />} />
                  <Route path="/journal/:id" element={<EntryDetail />} />
                  <Route path="/insights" element={<Insights />} />
                  <Route path="/prompts" element={<Prompts />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
