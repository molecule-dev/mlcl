import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Browse = lazy(() => import('./pages/Browse.js').then((m) => ({ default: m.Browse })))
const Certificate = lazy(() =>
  import('./pages/Certificate.js').then((m) => ({ default: m.Certificate })),
)
const Checkout = lazy(() => import('./pages/Checkout.js').then((m) => ({ default: m.Checkout })))
const CourseDetail = lazy(() =>
  import('./pages/CourseDetail.js').then((m) => ({ default: m.CourseDetail })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const InstructorCourseEditor = lazy(() =>
  import('./pages/InstructorCourseEditor.js').then((m) => ({ default: m.InstructorCourseEditor })),
)
const InstructorDashboard = lazy(() =>
  import('./pages/InstructorDashboard.js').then((m) => ({ default: m.InstructorDashboard })),
)
const InstructorProfile = lazy(() =>
  import('./pages/InstructorProfile.js').then((m) => ({ default: m.InstructorProfile })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Lesson = lazy(() => import('./pages/Lesson.js').then((m) => ({ default: m.Lesson })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyLearning = lazy(() =>
  import('./pages/MyLearning.js').then((m) => ({ default: m.MyLearning })),
)
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
