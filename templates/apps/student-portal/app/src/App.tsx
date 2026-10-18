import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { StudentPortalLayout } from './components/StudentPortalLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AssignmentDetail = lazy(() =>
  import('./pages/AssignmentDetail.js').then((m) => ({ default: m.AssignmentDetail })),
)
const Assignments = lazy(() =>
  import('./pages/Assignments.js').then((m) => ({ default: m.Assignments })),
)
const Attendance = lazy(() =>
  import('./pages/Attendance.js').then((m) => ({ default: m.Attendance })),
)
const Calendar = lazy(() => import('./pages/Calendar.js').then((m) => ({ default: m.Calendar })))
const CourseDetail = lazy(() =>
  import('./pages/CourseDetail.js').then((m) => ({ default: m.CourseDetail })),
)
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Grades = lazy(() => import('./pages/Grades.js').then((m) => ({ default: m.Grades })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Messages = lazy(() => import('./pages/Messages.js').then((m) => ({ default: m.Messages })))
const MessageThread = lazy(() =>
  import('./pages/MessageThread.js').then((m) => ({ default: m.MessageThread })),
)
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ReportCard = lazy(() =>
  import('./pages/ReportCard.js').then((m) => ({ default: m.ReportCard })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Schedule = lazy(() => import('./pages/Schedule.js').then((m) => ({ default: m.Schedule })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))

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
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<AuthGuard />}>
                <Route element={<StudentPortalLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/grades" element={<Grades />} />
                  <Route path="/grades/report-card" element={<ReportCard />} />
                  <Route path="/assignments" element={<Assignments />} />
                  <Route path="/assignments/:id" element={<AssignmentDetail />} />
                  <Route path="/courses/:id" element={<CourseDetail />} />
                  <Route path="/calendar" element={<Calendar />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/messages/:id" element={<MessageThread />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
