import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { createFetchClient, setClient as setHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { API_BASE_URL } from './config.js'

const httpClient = createFetchClient({ baseURL: API_BASE_URL.replace(/\/api$/, '') })
setHttpClient(httpClient)
import { AuthGuard } from './components/AuthGuard.js'
import { RefractLayout } from './components/RefractLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const PullRequestDetail = lazy(() =>
  import('./pages/PullRequestDetail.js').then((m) => ({ default: m.PullRequestDetail })),
)
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const Repositories = lazy(() =>
  import('./pages/Repositories.js').then((m) => ({ default: m.Repositories })),
)
const RepositoryDetail = lazy(() =>
  import('./pages/RepositoryDetail.js').then((m) => ({ default: m.RepositoryDetail })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const ReviewHistory = lazy(() =>
  import('./pages/ReviewHistory.js').then((m) => ({ default: m.ReviewHistory })),
)
const RulesEditor = lazy(() =>
  import('./pages/RulesEditor.js').then((m) => ({ default: m.RulesEditor })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter useTransitions={false}>
        <MoleculeProvider
          auth={authClient}
          http={httpClient}
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
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route element={<AuthGuard />}>
                <Route element={<RefractLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/repos" element={<Repositories />} />
                  <Route path="/repos/:id" element={<RepositoryDetail />} />
                  <Route path="/prs/:id" element={<PullRequestDetail />} />
                  <Route path="/history" element={<ReviewHistory />} />
                  <Route path="/rules" element={<RulesEditor />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
