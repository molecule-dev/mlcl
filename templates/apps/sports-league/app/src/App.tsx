import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PennantLayout } from './components/PennantLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MatchDetail = lazyPage(() =>
  import('./pages/MatchDetail.js').then((m) => ({ default: m.MatchDetail })),
)
const Matches = lazyPage(() => import('./pages/Matches.js').then((m) => ({ default: m.Matches })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PlayerDetail = lazyPage(() =>
  import('./pages/PlayerDetail.js').then((m) => ({ default: m.PlayerDetail })),
)
const Players = lazyPage(() => import('./pages/Players.js').then((m) => ({ default: m.Players })))
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Schedule = lazyPage(() =>
  import('./pages/Schedule.js').then((m) => ({ default: m.Schedule })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Standings = lazyPage(() =>
  import('./pages/Standings.js').then((m) => ({ default: m.Standings })),
)
const Stats = lazyPage(() => import('./pages/Stats.js').then((m) => ({ default: m.Stats })))
const TeamDetail = lazyPage(() =>
  import('./pages/TeamDetail.js').then((m) => ({ default: m.TeamDetail })),
)
const Teams = lazyPage(() => import('./pages/Teams.js').then((m) => ({ default: m.Teams })))
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
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route element={<AuthGuard />}>
                <Route element={<PennantLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/standings" element={<Standings />} />
                  <Route path="/teams" element={<Teams />} />
                  <Route path="/teams/:id" element={<TeamDetail />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/matches/:id" element={<MatchDetail />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/players/:id" element={<PlayerDetail />} />
                  <Route path="/stats" element={<Stats />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
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
