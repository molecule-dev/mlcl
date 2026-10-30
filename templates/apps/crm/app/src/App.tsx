import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { CrmLayout } from './components/CrmLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const ActivitiesPage = lazy(() =>
  import('./pages/Activities.js').then((m) => ({ default: m.ActivitiesPage })),
)
const CompaniesPage = lazy(() =>
  import('./pages/Companies.js').then((m) => ({ default: m.CompaniesPage })),
)
const CompanyDetailPage = lazy(() =>
  import('./pages/CompanyDetail.js').then((m) => ({ default: m.CompanyDetailPage })),
)
const ContactDetailPage = lazy(() =>
  import('./pages/ContactDetail.js').then((m) => ({ default: m.ContactDetailPage })),
)
const ContactsPage = lazy(() =>
  import('./pages/Contacts.js').then((m) => ({ default: m.ContactsPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const DealDetailPage = lazy(() =>
  import('./pages/DealDetail.js').then((m) => ({ default: m.DealDetailPage })),
)
const DealsPage = lazy(() => import('./pages/Deals.js').then((m) => ({ default: m.DealsPage })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Suspense fallback={null}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* All CRM routes behind AuthGuard, sharing the CrmLayout chrome */}
              <Route element={<AuthGuard />}>
                <Route element={<CrmLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/contacts/:id" element={<ContactDetailPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/companies/:id" element={<CompanyDetailPage />} />
                  <Route path="/deals" element={<DealsPage />} />
                  <Route path="/deals/:id" element={<DealDetailPage />} />
                  <Route path="/activities" element={<ActivitiesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/notifications" element={<Notifications />} />
                </Route>
                {/* Renders its own Header/Footer chrome, so it lives outside CrmLayout */}
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>

              {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
              <Route path="/pricing" element={<Pricing />} />

              {/* Public content pages */}
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
