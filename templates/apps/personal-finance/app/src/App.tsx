import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { About } from './pages/About.js'
import { AccountDetail } from './pages/AccountDetail.js'
import { AccountsPage } from './pages/Accounts.js'
import { AddAccount } from './pages/AddAccount.js'
import { AddBudget } from './pages/AddBudget.js'
import { AddGoal } from './pages/AddGoal.js'
import { AddTransaction } from './pages/AddTransaction.js'
import { BudgetsPage } from './pages/Budgets.js'
import { Categories } from './pages/Categories.js'
import { DashboardPage } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GoalsPage } from './pages/Goals.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ReportsPage } from './pages/Reports.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { TransactionDetail } from './pages/TransactionDetail.js'
import { TransactionsPage } from './pages/Transactions.js'
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
