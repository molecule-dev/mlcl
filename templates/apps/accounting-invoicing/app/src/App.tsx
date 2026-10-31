import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { LedgerLayout } from './components/LedgerLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Accounts = lazyPage(() =>
  import('./pages/Accounts.js').then((m) => ({ default: m.Accounts })),
)
const CustomerDetail = lazyPage(() =>
  import('./pages/CustomerDetail.js').then((m) => ({ default: m.CustomerDetail })),
)
const Customers = lazyPage(() =>
  import('./pages/Customers.js').then((m) => ({ default: m.Customers })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const ExpenseDetail = lazyPage(() =>
  import('./pages/ExpenseDetail.js').then((m) => ({ default: m.ExpenseDetail })),
)
const Expenses = lazyPage(() =>
  import('./pages/Expenses.js').then((m) => ({ default: m.Expenses })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const InvoiceDetail = lazyPage(() =>
  import('./pages/InvoiceDetail.js').then((m) => ({ default: m.InvoiceDetail })),
)
const Invoices = lazyPage(() =>
  import('./pages/Invoices.js').then((m) => ({ default: m.Invoices })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewExpense = lazyPage(() =>
  import('./pages/NewExpense.js').then((m) => ({ default: m.NewExpense })),
)
const NewInvoice = lazyPage(() =>
  import('./pages/NewInvoice.js').then((m) => ({ default: m.NewInvoice })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Payments = lazyPage(() =>
  import('./pages/Payments.js').then((m) => ({ default: m.Payments })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Reports = lazyPage(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Taxes = lazyPage(() => import('./pages/Taxes.js').then((m) => ({ default: m.Taxes })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
