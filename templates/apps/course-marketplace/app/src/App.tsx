import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Browse } from './pages/Browse.js'
import { Certificate } from './pages/Certificate.js'
import { Checkout } from './pages/Checkout.js'
import { CourseDetail } from './pages/CourseDetail.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { InstructorCourseEditor } from './pages/InstructorCourseEditor.js'
import { InstructorDashboard } from './pages/InstructorDashboard.js'
import { InstructorProfile } from './pages/InstructorProfile.js'
import { Landing } from './pages/Landing.js'
import { Lesson } from './pages/Lesson.js'
import { Login } from './pages/Login.js'
import { MyLearning } from './pages/MyLearning.js'
import { NotFound } from './pages/NotFound.js'
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
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/instructors/:id" element={<InstructorProfile />} />
            <Route element={<AuthGuard />}>
              <Route path="/lesson/:id" element={<Lesson />} />
              <Route path="/courses/:id/lessons/:lessonId" element={<Lesson />} />
              <Route path="/my-learning" element={<MyLearning />} />
              <Route path="/instructor" element={<InstructorDashboard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/checkout/return" element={<Checkout />} />
              <Route path="/instructor/courses/:id/edit" element={<InstructorCourseEditor />} />
              <Route path="/my-learning/:courseId/certificate" element={<Certificate />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
