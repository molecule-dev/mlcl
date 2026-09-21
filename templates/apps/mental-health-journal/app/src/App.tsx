import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { MentalHealthJournalLayout } from './components/MentalHealthJournalLayout.js'
import { About } from './pages/About.js'
import { Calendar } from './pages/Calendar.js'
import { EntryComposer } from './pages/EntryComposer.js'
import { EntryDetail } from './pages/EntryDetail.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Home } from './pages/Home.js'
import { Insights } from './pages/Insights.js'
import { Journal } from './pages/Journal.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Prompts } from './pages/Prompts.js'
import { ResetPassword } from './pages/ResetPassword.js'
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
