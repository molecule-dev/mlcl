import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AccountDetail = lazyPage(() =>
  import('./pages/AccountDetail.js').then((m) => ({ default: m.AccountDetail })),
)
const AccountsPage = lazyPage(() =>
  import('./pages/Accounts.js').then((m) => ({ default: m.AccountsPage })),
)
const AddAccount = lazyPage(() =>
  import('./pages/AddAccount.js').then((m) => ({ default: m.AddAccount })),
)
const AddBudget = lazyPage(() =>
  import('./pages/AddBudget.js').then((m) => ({ default: m.AddBudget })),
)
const AddGoal = lazyPage(() => import('./pages/AddGoal.js').then((m) => ({ default: m.AddGoal })))
const AddTransaction = lazyPage(() =>
  import('./pages/AddTransaction.js').then((m) => ({ default: m.AddTransaction })),
)
const BudgetsPage = lazyPage(() =>
  import('./pages/Budgets.js').then((m) => ({ default: m.BudgetsPage })),
)
const Categories = lazyPage(() =>
  import('./pages/Categories.js').then((m) => ({ default: m.Categories })),
)
const DashboardPage = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GoalsPage = lazyPage(() => import('./pages/Goals.js').then((m) => ({ default: m.GoalsPage })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReportsPage = lazyPage(() =>
  import('./pages/Reports.js').then((m) => ({ default: m.ReportsPage })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TransactionDetail = lazyPage(() =>
  import('./pages/TransactionDetail.js').then((m) => ({ default: m.TransactionDetail })),
)
const TransactionsPage = lazyPage(() =>
  import('./pages/Transactions.js').then((m) => ({ default: m.TransactionsPage })),
)
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
