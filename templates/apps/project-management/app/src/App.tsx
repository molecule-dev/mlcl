import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { useParams } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { About } from './pages/About.js'
import { BoardPage } from './pages/Board.js'
import { DashboardPage } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { Login } from './pages/Login.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TaskListPage } from './pages/TaskList.js'
import { Terms } from './pages/Terms.js'
import { TimelinePage } from './pages/Timeline.js'
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
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
