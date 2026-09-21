import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { VirtualClassroomLayout } from './components/VirtualClassroomLayout.js'
import { About } from './pages/About.js'
import { AssignmentDetail } from './pages/AssignmentDetail.js'
import { Assignments } from './pages/Assignments.js'
import { Calendar } from './pages/Calendar.js'
import { Classroom } from './pages/Classroom.js'
import { CourseDetail } from './pages/CourseDetail.js'
import { Courses } from './pages/Courses.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Grades } from './pages/Grades.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { Whiteboard } from './pages/Whiteboard.js'
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
              <Route element={<VirtualClassroomLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/assignments" element={<Assignments />} />
                <Route path="/assignments/:id" element={<AssignmentDetail />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/grades" element={<Grades />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
              <Route path="/class/:id" element={<Classroom />} />
              <Route path="/whiteboard/:id" element={<Whiteboard />} />
            </Route>
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
