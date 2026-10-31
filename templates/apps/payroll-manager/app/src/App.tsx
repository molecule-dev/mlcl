import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PayrollManagerLayout } from './components/PayrollManagerLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AuditLog = lazyPage(() =>
  import('./pages/AuditLog.js').then((m) => ({ default: m.AuditLog })),
)
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const EmployeeDetail = lazyPage(() =>
  import('./pages/EmployeeDetail.js').then((m) => ({ default: m.EmployeeDetail })),
)
const EmployeeForm = lazyPage(() =>
  import('./pages/EmployeeForm.js').then((m) => ({ default: m.EmployeeForm })),
)
const Employees = lazyPage(() =>
  import('./pages/Employees.js').then((m) => ({ default: m.Employees })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PayRunDetail = lazyPage(() =>
  import('./pages/PayRunDetail.js').then((m) => ({ default: m.PayRunDetail })),
)
const PayRuns = lazyPage(() => import('./pages/PayRuns.js').then((m) => ({ default: m.PayRuns })))
const PayStub = lazyPage(() => import('./pages/PayStub.js').then((m) => ({ default: m.PayStub })))
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
const RunPayroll = lazyPage(() =>
  import('./pages/RunPayroll.js').then((m) => ({ default: m.RunPayroll })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TaxCenter = lazyPage(() =>
  import('./pages/TaxCenter.js').then((m) => ({ default: m.TaxCenter })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<AuthGuard />}>
                <Route element={<PayrollManagerLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/employees" element={<Employees />} />
                  <Route path="/employees/new" element={<EmployeeForm />} />
                  <Route path="/employees/:id/edit" element={<EmployeeForm />} />
                  <Route path="/employees/:id" element={<EmployeeDetail />} />
                  <Route path="/pay-runs" element={<PayRuns />} />
                  <Route path="/pay-runs/:id" element={<PayRunDetail />} />
                  <Route path="/run-payroll" element={<RunPayroll />} />
                  <Route path="/pay-stub/:id" element={<PayStub />} />
                  <Route path="/taxes" element={<TaxCenter />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/audit-log" element={<AuditLog />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/billing" element={<Billing />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
