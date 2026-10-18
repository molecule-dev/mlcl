import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Archive = lazy(() => import('./pages/Archive.js').then((m) => ({ default: m.Archive })))
const ArchivePlay = lazy(() =>
  import('./pages/ArchivePlay.js').then((m) => ({ default: m.ArchivePlay })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const HowToPlay = lazy(() => import('./pages/HowToPlay.js').then((m) => ({ default: m.HowToPlay })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Leaderboard = lazy(() =>
  import('./pages/Leaderboard.js').then((m) => ({ default: m.Leaderboard })),
)
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Play = lazy(() => import('./pages/Play.js').then((m) => ({ default: m.Play })))
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Stats = lazy(() => import('./pages/Stats.js').then((m) => ({ default: m.Stats })))
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
        <AnalyticsRouteListener />
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/how-to-play" element={<HowToPlay />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route element={<AuthGuard />}>
              {/* The game screens run chromeless — full attention on the board. */}
              <Route path="/play" element={<Play />} />
              <Route path="/archive/:date" element={<ArchivePlay />} />
              <Route element={<AppLayout />}>
                <Route path="/stats" element={<Stats />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
