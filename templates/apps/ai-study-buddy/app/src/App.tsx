import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { KoanLayout } from './components/KoanLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const CourseDetail = lazy(() =>
  import('./pages/CourseDetail.js').then((m) => ({ default: m.CourseDetail })),
)
const Courses = lazy(() => import('./pages/Courses.js').then((m) => ({ default: m.Courses })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const DeckDetail = lazy(() =>
  import('./pages/DeckDetail.js').then((m) => ({ default: m.DeckDetail })),
)
const Flashcards = lazy(() =>
  import('./pages/Flashcards.js').then((m) => ({ default: m.Flashcards })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Progress = lazy(() => import('./pages/Progress.js').then((m) => ({ default: m.Progress })))
const Quiz = lazy(() => import('./pages/Quiz.js').then((m) => ({ default: m.Quiz })))
const QuizResults = lazy(() =>
  import('./pages/QuizResults.js').then((m) => ({ default: m.QuizResults })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const StudySession = lazy(() =>
  import('./pages/StudySession.js').then((m) => ({ default: m.StudySession })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter useTransitions={false}>
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
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
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route element={<AuthGuard />}>
                <Route element={<KoanLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/study/:id" element={<StudySession />} />
                  <Route path="/flashcards" element={<Flashcards />} />
                  <Route path="/flashcards/:id" element={<DeckDetail />} />
                  <Route path="/quiz/:id" element={<Quiz />} />
                  <Route path="/quiz/:id/results" element={<QuizResults />} />
                  <Route path="/courses" element={<Courses />} />
                  <Route path="/courses/:id" element={<CourseDetail />} />
                  <Route path="/progress" element={<Progress />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
