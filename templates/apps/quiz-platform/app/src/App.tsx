import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Discover = lazyPage(() =>
  import('./pages/Discover.js').then((m) => ({ default: m.Discover })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const HostLobby = lazyPage(() =>
  import('./pages/HostLobby.js').then((m) => ({ default: m.HostLobby })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Leaderboard = lazyPage(() =>
  import('./pages/Leaderboard.js').then((m) => ({ default: m.Leaderboard })),
)
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyQuizzes = lazyPage(() =>
  import('./pages/MyQuizzes.js').then((m) => ({ default: m.MyQuizzes })),
)
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const QuizBuilder = lazyPage(() =>
  import('./pages/QuizBuilder.js').then((m) => ({ default: m.QuizBuilder })),
)
const QuizDetail = lazyPage(() =>
  import('./pages/QuizDetail.js').then((m) => ({ default: m.QuizDetail })),
)
const QuizPlay = lazyPage(() =>
  import('./pages/QuizPlay.js').then((m) => ({ default: m.QuizPlay })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Results = lazyPage(() => import('./pages/Results.js').then((m) => ({ default: m.Results })))
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route element={<AuthGuard />}>
              <Route path="/quiz/:id/play" element={<QuizPlay />} />
              <Route path="/quiz/:id/lobby" element={<HostLobby />} />
              <Route path="/quiz/:id/results" element={<Results />} />
              <Route element={<AppLayout />}>
                <Route path="/discover" element={<Discover />} />
                <Route path="/my-quizzes" element={<MyQuizzes />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/u/:username" element={<Profile />} />
                <Route path="/quiz/:id/edit" element={<QuizBuilder />} />
                <Route path="/quiz/:id" element={<QuizDetail />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
