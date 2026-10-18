import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { TimeTrackingLayout } from './components/TimeTrackingLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ClientDetail = lazy(() =>
  import('./pages/ClientDetail.js').then((m) => ({ default: m.ClientDetail })),
)
const Clients = lazy(() => import('./pages/Clients.js').then((m) => ({ default: m.Clients })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const InvoiceDetail = lazy(() =>
  import('./pages/InvoiceDetail.js').then((m) => ({ default: m.InvoiceDetail })),
)
const Invoices = lazy(() => import('./pages/Invoices.js').then((m) => ({ default: m.Invoices })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProjectDetail = lazy(() =>
  import('./pages/ProjectDetail.js').then((m) => ({ default: m.ProjectDetail })),
)
const Projects = lazy(() => import('./pages/Projects.js').then((m) => ({ default: m.Projects })))
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TimeEntries = lazy(() =>
  import('./pages/TimeEntries.js').then((m) => ({ default: m.TimeEntries })),
)
const Timesheet = lazy(() => import('./pages/Timesheet.js').then((m) => ({ default: m.Timesheet })))

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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              <Route element={<AuthGuard />}>
                <Route element={<TimeTrackingLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/entries" element={<TimeEntries />} />
                  <Route path="/timesheet" element={<Timesheet />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/clients/:id" element={<ClientDetail />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/invoices" element={<Invoices />} />
                  <Route path="/invoices/:id" element={<InvoiceDetail />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
