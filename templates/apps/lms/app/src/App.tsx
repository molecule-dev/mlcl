import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AssignmentsPage = lazy(() =>
  import('./pages/Assignments.js').then((m) => ({ default: m.AssignmentsPage })),
)
const CourseDetailPage = lazy(() =>
  import('./pages/CourseDetail.js').then((m) => ({ default: m.CourseDetailPage })),
)
const CoursesPage = lazy(() =>
  import('./pages/Courses.js').then((m) => ({ default: m.CoursesPage })),
)
const DashboardPage = lazy(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.DashboardPage })),
)
const DiscussionsPage = lazy(() =>
  import('./pages/Discussions.js').then((m) => ({ default: m.DiscussionsPage })),
)
const DiscussionThreadPage = lazy(() =>
  import('./pages/DiscussionThread.js').then((m) => ({ default: m.DiscussionThreadPage })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GradebookPage = lazy(() =>
  import('./pages/Gradebook.js').then((m) => ({ default: m.GradebookPage })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Lesson = lazy(() => import('./pages/Lesson.js').then((m) => ({ default: m.Lesson })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
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
        <AnalyticsRouteListener />
        <RootErrorBoundary>
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
