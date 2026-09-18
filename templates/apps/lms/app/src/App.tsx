import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { About } from './pages/About.js'
import { AssignmentsPage } from './pages/Assignments.js'
import { CourseDetailPage } from './pages/CourseDetail.js'
import { CoursesPage } from './pages/Courses.js'
import { DashboardPage } from './pages/Dashboard.js'
import { DiscussionsPage } from './pages/Discussions.js'
import { DiscussionThreadPage } from './pages/DiscussionThread.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GradebookPage } from './pages/Gradebook.js'
import { Help } from './pages/Help.js'
import { Lesson } from './pages/Lesson.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
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
        <AnalyticsRouteListener />
        <RootErrorBoundary>
          <Routes>
            {/* Public auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Authenticated student routes */}
            <Route element={<AuthGuard />}>
              {/* Standard dashboard layout with sidebar */}
              <Route index element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/course/:courseId" element={<CourseDetailPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/assignments" element={<AssignmentsPage />} />
              <Route path="/discussions" element={<DiscussionsPage />} />
              <Route path="/discussions/:discussionId" element={<DiscussionThreadPage />} />
              <Route path="/gradebook" element={<GradebookPage />} />
              <Route path="/settings" element={<Settings />} />

              {/* Fullscreen lesson player -- no sidebar */}
              <Route path="/course/:courseId/lesson/:lessonId" element={<Lesson />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
              {/* Header/footer shell so the page isn't chrome-less */}
              <Route element={<AppLayout />}>
                <Route path="/notifications" element={<Notifications />} />
              </Route>
            </Route>

            {/* Public pricing page — outside AuthGuard so anonymous visitors can see plans */}
            <Route path="/pricing" element={<Pricing />} />

            {/* Fallback */}
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route element={<AppLayout />}>
              <Route path="/help" element={<Help />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
