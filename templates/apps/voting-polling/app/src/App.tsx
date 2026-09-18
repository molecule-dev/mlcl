import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { VotingPollingLayout } from './components/VotingPollingLayout.js'
import { About } from './pages/About.js'
import { Analytics } from './pages/Analytics.js'
import { AudienceQA } from './pages/AudienceQA.js'
import { Ballot } from './pages/Ballot.js'
import { Billing } from './pages/Billing.js'
import { CreatePoll } from './pages/CreatePoll.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { LiveResults } from './pages/LiveResults.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { PollDetail } from './pages/PollDetail.js'
import { PresenterMode } from './pages/PresenterMode.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Team } from './pages/Team.js'
import { Terms } from './pages/Terms.js'
import { Voters } from './pages/Voters.js'
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
      </MoleculeProvider>
    </BrowserRouter>
  )
}
