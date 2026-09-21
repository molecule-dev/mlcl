import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Discover } from './pages/Discover.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { HostLobby } from './pages/HostLobby.js'
import { Landing } from './pages/Landing.js'
import { Leaderboard } from './pages/Leaderboard.js'
import { Login } from './pages/Login.js'
import { MyQuizzes } from './pages/MyQuizzes.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { QuizBuilder } from './pages/QuizBuilder.js'
import { QuizDetail } from './pages/QuizDetail.js'
import { QuizPlay } from './pages/QuizPlay.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Results } from './pages/Results.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'

export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <AnalyticsRouteListener />
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
      </MoleculeProvider>
    </BrowserRouter>
  )
}
