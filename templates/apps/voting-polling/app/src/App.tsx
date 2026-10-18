import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { VotingPollingLayout } from './components/VotingPollingLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazy(() => import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })))
const AudienceQA = lazy(() =>
  import('./pages/AudienceQA.js').then((m) => ({ default: m.AudienceQA })),
)
const Ballot = lazy(() => import('./pages/Ballot.js').then((m) => ({ default: m.Ballot })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const CreatePoll = lazy(() =>
  import('./pages/CreatePoll.js').then((m) => ({ default: m.CreatePoll })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const LiveResults = lazy(() =>
  import('./pages/LiveResults.js').then((m) => ({ default: m.LiveResults })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PollDetail = lazy(() =>
  import('./pages/PollDetail.js').then((m) => ({ default: m.PollDetail })),
)
const PresenterMode = lazy(() =>
  import('./pages/PresenterMode.js').then((m) => ({ default: m.PresenterMode })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Team = lazy(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Voters = lazy(() => import('./pages/Voters.js').then((m) => ({ default: m.Voters })))
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
              <Route path="/polls/:id/present" element={<PresenterMode />} />
              <Route path="/vote/:id" element={<Ballot />} />
              <Route element={<VotingPollingLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/polls/new" element={<CreatePoll />} />
                <Route path="/polls/:id" element={<PollDetail />} />
                <Route path="/polls/:id/live" element={<LiveResults />} />
                <Route path="/polls/:id/qa" element={<AudienceQA />} />
                <Route path="/voters" element={<Voters />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/team" element={<Team />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
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
