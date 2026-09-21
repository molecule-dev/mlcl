import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { BillSplitLayout } from './components/BillSplitLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Activity } from './pages/Activity.js'
import { Balances } from './pages/Balances.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Friends } from './pages/Friends.js'
import { GroupDetail } from './pages/GroupDetail.js'
import { Groups } from './pages/Groups.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewExpense } from './pages/NewExpense.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'

export function App() {
  return (
    <RootErrorBoundary>
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
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<AuthGuard />}>
              <Route element={<BillSplitLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
                <Route path="/expenses/new" element={<NewExpense />} />
                <Route path="/balances" element={<Balances />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
