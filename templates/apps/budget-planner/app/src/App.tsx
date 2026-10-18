import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CofferLayout } from './components/CofferLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AccountDetail = lazy(() =>
  import('./pages/AccountDetail.js').then((m) => ({ default: m.AccountDetail })),
)
const Accounts = lazy(() => import('./pages/Accounts.js').then((m) => ({ default: m.Accounts })))
const AddTransaction = lazy(() =>
  import('./pages/AddTransaction.js').then((m) => ({ default: m.AddTransaction })),
)
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Budget = lazy(() => import('./pages/Budget.js').then((m) => ({ default: m.Budget })))
const Categories = lazy(() =>
  import('./pages/Categories.js').then((m) => ({ default: m.Categories })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GoalDetail = lazy(() =>
  import('./pages/GoalDetail.js').then((m) => ({ default: m.GoalDetail })),
)
const Goals = lazy(() => import('./pages/Goals.js').then((m) => ({ default: m.Goals })))
const ImportTransactions = lazy(() =>
  import('./pages/ImportTransactions.js').then((m) => ({ default: m.ImportTransactions })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TransactionDetail = lazy(() =>
  import('./pages/TransactionDetail.js').then((m) => ({ default: m.TransactionDetail })),
)
const Transactions = lazy(() =>
  import('./pages/Transactions.js').then((m) => ({ default: m.Transactions })),
)
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route element={<AuthGuard />}>
                <Route element={<CofferLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/budget" element={<Budget />} />
                  <Route path="/accounts" element={<Accounts />} />
                  <Route path="/accounts/:id" element={<AccountDetail />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/transactions/new" element={<AddTransaction />} />
                  <Route path="/transactions/:id" element={<TransactionDetail />} />
                  <Route path="/import" element={<ImportTransactions />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/goals" element={<Goals />} />
                  <Route path="/goals/:id" element={<GoalDetail />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/profile" element={<Profile />} />
                  <Route path="/settings/billing" element={<Billing />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
