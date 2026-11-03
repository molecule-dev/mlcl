import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EngramLayout } from './components/EngramLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const CardEdit = lazyPage(() =>
  import('./pages/CardEdit.js').then((m) => ({ default: m.CardEdit })),
)
const CardNew = lazyPage(() => import('./pages/CardNew.js').then((m) => ({ default: m.CardNew })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const DeckDetail = lazyPage(() =>
  import('./pages/DeckDetail.js').then((m) => ({ default: m.DeckDetail })),
)
const Decks = lazyPage(() => import('./pages/Decks.js').then((m) => ({ default: m.Decks })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SessionSummary = lazyPage(() =>
  import('./pages/SessionSummary.js').then((m) => ({ default: m.SessionSummary })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Stats = lazyPage(() => import('./pages/Stats.js').then((m) => ({ default: m.Stats })))
const Study = lazyPage(() => import('./pages/Study.js').then((m) => ({ default: m.Study })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          awaitSession
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
                <Route element={<EngramLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/decks" element={<Decks />} />
                  <Route path="/decks/:deckId" element={<DeckDetail />} />
                  <Route path="/decks/:deckId/cards/new" element={<CardNew />} />
                  <Route path="/decks/:deckId/cards/:cardId/edit" element={<CardEdit />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/study/:deckId" element={<Study />} />
                  <Route path="/study/:deckId/summary" element={<SessionSummary />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
