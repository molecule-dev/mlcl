import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CofferLayout } from './components/CofferLayout.js'
import { About } from './pages/About.js'
import { AccountDetail } from './pages/AccountDetail.js'
import { Accounts } from './pages/Accounts.js'
import { AddTransaction } from './pages/AddTransaction.js'
import { Billing } from './pages/Billing.js'
import { Budget } from './pages/Budget.js'
import { Categories } from './pages/Categories.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GoalDetail } from './pages/GoalDetail.js'
import { Goals } from './pages/Goals.js'
import { ImportTransactions } from './pages/ImportTransactions.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Reports } from './pages/Reports.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { TransactionDetail } from './pages/TransactionDetail.js'
import { Transactions } from './pages/Transactions.js'
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
