import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AccountDetail = lazy(() =>
  import('./pages/AccountDetail.js').then((m) => ({ default: m.AccountDetail })),
)
const AccountsPage = lazy(() =>
  import('./pages/Accounts.js').then((m) => ({ default: m.AccountsPage })),
)
const AddAccount = lazy(() =>
  import('./pages/AddAccount.js').then((m) => ({ default: m.AddAccount })),
)
const AddBudget = lazy(() => import('./pages/AddBudget.js').then((m) => ({ default: m.AddBudget })))
const AddGoal = lazy(() => import('./pages/AddGoal.js').then((m) => ({ default: m.AddGoal })))
const AddTransaction = lazy(() =>
  import('./pages/AddTransaction.js').then((m) => ({ default: m.AddTransaction })),
)
const BudgetsPage = lazy(() =>
  import('./pages/Budgets.js').then((m) => ({ default: m.BudgetsPage })),
)
const Categories = lazy(() =>
  import('./pages/Categories.js').then((m) => ({ default: m.Categories })),
)
const DashboardPage = lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GoalsPage = lazy(() => import('./pages/Goals.js').then((m) => ({ default: m.GoalsPage })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReportsPage = lazy(() =>
  import('./pages/Reports.js').then((m) => ({ default: m.ReportsPage })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TransactionDetail = lazy(() =>
  import('./pages/TransactionDetail.js').then((m) => ({ default: m.TransactionDetail })),
)
const TransactionsPage = lazy(() =>
  import('./pages/Transactions.js').then((m) => ({ default: m.TransactionsPage })),
)
export function App() {
  return (
    <BrowserRouter
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <AnalyticsRouteListener />
        <RootErrorBoundary>
          <Suspense fallback={null}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* All finance routes behind AuthGuard */}
              <Route element={<AuthGuard />}>
                <Route index element={<DashboardPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/transactions/new" element={<AddTransaction />} />
                <Route path="/transactions/:id" element={<TransactionDetail />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/accounts/new" element={<AddAccount />} />
                <Route path="/accounts/:id" element={<AccountDetail />} />
                <Route path="/budgets" element={<BudgetsPage />} />
                <Route path="/budgets/new" element={<AddBudget />} />
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/goals/new" element={<AddGoal />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>

              {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
              <Route path="/pricing" element={<Pricing />} />

              {/* Public about + legal pages */}
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
