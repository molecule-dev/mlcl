import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'

// Route-level code splitting: every page is its own chunk, so a full page load
// downloads the framework plus only the page it shows. The two `*Route`
// helpers below render these components from inside <Routes>, so they sit
// under the Suspense boundary too.
const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AgentAnalyticsPage = lazy(() =>
  import('./pages/AgentAnalyticsPage.js').then((m) => ({ default: m.AgentAnalyticsPage })),
)
const AgentDashboard = lazy(() =>
  import('./pages/AgentDashboard.js').then((m) => ({ default: m.AgentDashboard })),
)
const AgentLeadsPage = lazy(() =>
  import('./pages/AgentLeadsPage.js').then((m) => ({ default: m.AgentLeadsPage })),
)
const AgentListingsPage = lazy(() =>
  import('./pages/AgentListingsPage.js').then((m) => ({ default: m.AgentListingsPage })),
)
const AgentProfilePage = lazy(() =>
  import('./pages/AgentProfilePage.js').then((m) => ({ default: m.AgentProfilePage })),
)
const AgentShowingsPage = lazy(() =>
  import('./pages/AgentShowingsPage.js').then((m) => ({ default: m.AgentShowingsPage })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const ListingEditorPage = lazy(() =>
  import('./pages/ListingEditorPage.js').then((m) => ({ default: m.ListingEditorPage })),
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
const PropertyDetailPage = lazy(() =>
  import('./pages/PropertyDetailPage.js').then((m) => ({ default: m.PropertyDetailPage })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SavedPropertiesPage = lazy(() =>
  import('./pages/SavedPropertiesPage.js').then((m) => ({ default: m.SavedPropertiesPage })),
)
const SearchPage = lazy(() =>
  import('./pages/SearchPage.js').then((m) => ({ default: m.SearchPage })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
function PropertyDetailRoute() {
  return <PropertyDetailPage />
}

function AgentProfileRoute() {
  return <AgentProfilePage />
}

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
        <AnalyticsRouteListener />
        <RootErrorBoundary>
          <Suspense fallback={null}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public property browsing */}
              <Route index element={<SearchPage />} />
              <Route path="/property/:id" element={<PropertyDetailRoute />} />
              <Route path="/agent/:id" element={<AgentProfileRoute />} />
              <Route path="/saved" element={<SavedPropertiesPage />} />

              {/* Authenticated agent/admin routes */}
              <Route element={<AuthGuard />}>
                <Route path="/admin" element={<AgentDashboard />} />
                <Route path="/admin/dashboard" element={<AgentDashboard />} />
                <Route path="/admin/listings" element={<AgentListingsPage />} />
                <Route path="/admin/listings/new" element={<ListingEditorPage />} />
                <Route path="/admin/listings/:id/edit" element={<ListingEditorPage />} />
                <Route path="/admin/leads" element={<AgentLeadsPage />} />
                <Route path="/admin/showings" element={<AgentShowingsPage />} />
                <Route path="/admin/analytics" element={<AgentAnalyticsPage />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>

              {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
              <Route path="/pricing" element={<Pricing />} />

              {/* Fallback */}
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/help" element={<Help />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
