import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CofferLayout } from './components/CofferLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AccountDetail = lazyPage(() =>
  import('./pages/AccountDetail.js').then((m) => ({ default: m.AccountDetail })),
)
const Accounts = lazyPage(() =>
  import('./pages/Accounts.js').then((m) => ({ default: m.Accounts })),
)
const AddTransaction = lazyPage(() =>
  import('./pages/AddTransaction.js').then((m) => ({ default: m.AddTransaction })),
)
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Budget = lazyPage(() => import('./pages/Budget.js').then((m) => ({ default: m.Budget })))
const Categories = lazyPage(() =>
  import('./pages/Categories.js').then((m) => ({ default: m.Categories })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GoalDetail = lazyPage(() =>
  import('./pages/GoalDetail.js').then((m) => ({ default: m.GoalDetail })),
)
const Goals = lazyPage(() => import('./pages/Goals.js').then((m) => ({ default: m.Goals })))
const ImportTransactions = lazyPage(() =>
  import('./pages/ImportTransactions.js').then((m) => ({ default: m.ImportTransactions })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reports = lazyPage(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
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
const Transactions = lazyPage(() =>
  import('./pages/Transactions.js').then((m) => ({ default: m.Transactions })),
)
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
