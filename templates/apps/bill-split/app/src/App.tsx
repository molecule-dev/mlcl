import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { BillSplitLayout } from './components/BillSplitLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Activity = lazy(() => import('./pages/Activity.js').then((m) => ({ default: m.Activity })))
const Balances = lazy(() => import('./pages/Balances.js').then((m) => ({ default: m.Balances })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Friends = lazy(() => import('./pages/Friends.js').then((m) => ({ default: m.Friends })))
const GroupDetail = lazy(() =>
  import('./pages/GroupDetail.js').then((m) => ({ default: m.GroupDetail })),
)
const Groups = lazy(() => import('./pages/Groups.js').then((m) => ({ default: m.Groups })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewExpense = lazy(() =>
  import('./pages/NewExpense.js').then((m) => ({ default: m.NewExpense })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
          <Suspense fallback={null}>
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
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
