import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { CadenceLayout } from './components/CadenceLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazyPage(() =>
  import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })),
)
const Completed = lazyPage(() =>
  import('./pages/Completed.js').then((m) => ({ default: m.Completed })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Inbox = lazyPage(() => import('./pages/Inbox.js').then((m) => ({ default: m.Inbox })))
const Labels = lazyPage(() => import('./pages/Labels.js').then((m) => ({ default: m.Labels })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProjectDetail = lazyPage(() =>
  import('./pages/ProjectDetail.js').then((m) => ({ default: m.ProjectDetail })),
)
const Projects = lazyPage(() =>
  import('./pages/Projects.js').then((m) => ({ default: m.Projects })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazyPage(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TaskDetail = lazyPage(() =>
  import('./pages/TaskDetail.js').then((m) => ({ default: m.TaskDetail })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Today = lazyPage(() => import('./pages/Today.js').then((m) => ({ default: m.Today })))
const Upcoming = lazyPage(() =>
  import('./pages/Upcoming.js').then((m) => ({ default: m.Upcoming })),
)
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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              {/* /plan-updated is public so post-Stripe-checkout returns
               * land on a friendly success screen even if the bearer cookie
               * was lost during the redirect. */}
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route element={<AuthGuard />}>
                <Route element={<CadenceLayout />}>
                  <Route path="/today" element={<Today />} />
                  <Route path="/inbox" element={<Inbox />} />
                  <Route path="/upcoming" element={<Upcoming />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:id" element={<ProjectDetail />} />
                  <Route path="/tasks/:id" element={<TaskDetail />} />
                  <Route path="/completed" element={<Completed />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/labels" element={<Labels />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
