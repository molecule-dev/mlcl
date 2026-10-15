import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { LedgerLayout } from './components/LedgerLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { Accounts } from './pages/Accounts.js'
import { CustomerDetail } from './pages/CustomerDetail.js'
import { Customers } from './pages/Customers.js'
import { Dashboard } from './pages/Dashboard.js'
import { ExpenseDetail } from './pages/ExpenseDetail.js'
import { Expenses } from './pages/Expenses.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { InvoiceDetail } from './pages/InvoiceDetail.js'
import { Invoices } from './pages/Invoices.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewExpense } from './pages/NewExpense.js'
import { NewInvoice } from './pages/NewInvoice.js'
import { Notifications } from './pages/Notifications.js'
import { Payments } from './pages/Payments.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Reports } from './pages/Reports.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Taxes } from './pages/Taxes.js'
import { Terms } from './pages/Terms.js'
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
              <Route element={<LedgerLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/invoices/new" element={<NewInvoice />} />
                <Route path="/invoices/:id" element={<InvoiceDetail />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/expenses/new" element={<NewExpense />} />
                <Route path="/expenses/:id" element={<ExpenseDetail />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/taxes" element={<Taxes />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
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
