import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { ToolbeltLayout } from './components/ToolbeltLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const CustomerDetail = lazyPage(() =>
  import('./pages/CustomerDetail.js').then((m) => ({ default: m.CustomerDetail })),
)
const Customers = lazyPage(() =>
  import('./pages/Customers.js').then((m) => ({ default: m.Customers })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Dispatch = lazyPage(() =>
  import('./pages/Dispatch.js').then((m) => ({ default: m.Dispatch })),
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
const JobDetail = lazyPage(() =>
  import('./pages/JobDetail.js').then((m) => ({ default: m.JobDetail })),
)
const Jobs = lazyPage(() => import('./pages/Jobs.js').then((m) => ({ default: m.Jobs })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NewCustomer = lazyPage(() =>
  import('./pages/NewCustomer.js').then((m) => ({ default: m.NewCustomer })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const QuoteDetail = lazyPage(() =>
  import('./pages/QuoteDetail.js').then((m) => ({ default: m.QuoteDetail })),
)
const QuoteEdit = lazyPage(() =>
  import('./pages/QuoteEdit.js').then((m) => ({ default: m.QuoteEdit })),
)
const QuoteNew = lazyPage(() =>
  import('./pages/QuoteNew.js').then((m) => ({ default: m.QuoteNew })),
)
const Quotes = lazyPage(() => import('./pages/Quotes.js').then((m) => ({ default: m.Quotes })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Technicians = lazyPage(() =>
  import('./pages/Technicians.js').then((m) => ({ default: m.Technicians })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          awaitSession
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
                <Route element={<ToolbeltLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/customers/new" element={<NewCustomer />} />
                  <Route path="/customers/:id" element={<CustomerDetail />} />
                  <Route path="/quotes" element={<Quotes />} />
                  <Route path="/quotes/new" element={<QuoteNew />} />
                  <Route path="/quotes/:id" element={<QuoteDetail />} />
                  <Route path="/quotes/:id/edit" element={<QuoteEdit />} />
                  <Route path="/jobs" element={<Jobs />} />
                  <Route path="/jobs/:id" element={<JobDetail />} />
                  <Route path="/dispatch" element={<Dispatch />} />
                  <Route path="/technicians" element={<Technicians />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/invoices/:id" element={<InvoiceDetail />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
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
