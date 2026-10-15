import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EngramLayout } from './components/EngramLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { CardEdit } from './pages/CardEdit.js'
import { CardNew } from './pages/CardNew.js'
import { Dashboard } from './pages/Dashboard.js'
import { DeckDetail } from './pages/DeckDetail.js'
import { Decks } from './pages/Decks.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SessionSummary } from './pages/SessionSummary.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Stats } from './pages/Stats.js'
import { Study } from './pages/Study.js'
import { Terms } from './pages/Terms.js'
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter useTransitions={false}>
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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
