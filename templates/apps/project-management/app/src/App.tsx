import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { useParams } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'

// Route-level code splitting: every page is its own chunk, so a full page load
// downloads the framework plus only the page it shows. The `*Route` helpers
// below render these components from inside <Routes>, so they sit under the
// Suspense boundary too.
const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const BoardPage = lazyPage(() => import('./pages/Board.js').then((m) => ({ default: m.BoardPage })))
const DashboardPage = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazyPage(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TaskListPage = lazyPage(() =>
  import('./pages/TaskList.js').then((m) => ({ default: m.TaskListPage })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const TimelinePage = lazyPage(() =>
  import('./pages/Timeline.js').then((m) => ({ default: m.TimelinePage })),
)
/** Extracts :projectId from the URL and passes it to the BoardPage */
function BoardRoute() {
  const { projectId } = useParams<{ projectId: string }>()
  return <BoardPage projectId={projectId || ''} />
}

/** Extracts :projectId from the URL and passes it to the TaskListPage */
function TaskListRoute() {
  const { projectId } = useParams<{ projectId: string }>()
  return <TaskListPage projectId={projectId || ''} />
}

/** Extracts :projectId from the URL and passes it to the TimelinePage */
function TimelineRoute() {
  const { projectId } = useParams<{ projectId: string }>()
  return <TimelinePage projectId={projectId || ''} />
}

export function App() {
  return (
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
        <RootErrorBoundary>
          <Suspense fallback={null}>
            <Routes>
              {/* Auth routes — outside project layout */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Authenticated project routes */}
              <Route element={<AuthGuard />}>
                {/* Dashboard — top-level overview */}
                <Route index element={<DashboardPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Project views with :projectId param */}
                <Route path="/projects/:projectId/board" element={<BoardRoute />} />
                <Route path="/projects/:projectId/tasks" element={<TaskListRoute />} />
                <Route path="/projects/:projectId/tasks/:taskId" element={<TaskListRoute />} />
                <Route path="/projects/:projectId/timeline" element={<TimelineRoute />} />
                <Route path="/projects/:projectId/calendar" element={<TimelineRoute />} />

                {/* Top-level views (no project scope) */}
                <Route path="/my-tasks" element={<TaskListPage projectId="" />} />
                <Route path="/tasks" element={<TaskListPage projectId="" />} />
                <Route path="/list" element={<TaskListPage projectId="" />} />
                <Route path="/calendar" element={<TimelinePage projectId="" />} />
                <Route path="/timeline" element={<TimelinePage projectId="" />} />
                <Route path="/board" element={<BoardPage projectId="" />} />
                <Route path="/projects" element={<DashboardPage />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>

              {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
              <Route path="/pricing" element={<Pricing />} />

              {/* Public marketing + legal pages */}
              <Route path="/about" element={<About />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/help" element={<Help />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
