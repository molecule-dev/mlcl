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

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Browse = lazyPage(() => import('./pages/Browse.js').then((m) => ({ default: m.Browse })))
const Certificate = lazyPage(() =>
  import('./pages/Certificate.js').then((m) => ({ default: m.Certificate })),
)
const Checkout = lazyPage(() =>
  import('./pages/Checkout.js').then((m) => ({ default: m.Checkout })),
)
const CourseDetail = lazyPage(() =>
  import('./pages/CourseDetail.js').then((m) => ({ default: m.CourseDetail })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazyPage(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const InstructorCourseEditor = lazyPage(() =>
  import('./pages/InstructorCourseEditor.js').then((m) => ({ default: m.InstructorCourseEditor })),
)
const InstructorDashboard = lazyPage(() =>
  import('./pages/InstructorDashboard.js').then((m) => ({ default: m.InstructorDashboard })),
)
const InstructorProfile = lazyPage(() =>
  import('./pages/InstructorProfile.js').then((m) => ({ default: m.InstructorProfile })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Lesson = lazyPage(() => import('./pages/Lesson.js').then((m) => ({ default: m.Lesson })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyLearning = lazyPage(() =>
  import('./pages/MyLearning.js').then((m) => ({ default: m.MyLearning })),
)
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
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
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
