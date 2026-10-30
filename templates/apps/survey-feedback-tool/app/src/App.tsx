import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SurveyFeedbackToolLayout } from './components/SurveyFeedbackToolLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazy(() => import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })))
const Builder = lazy(() => import('./pages/Builder.js').then((m) => ({ default: m.Builder })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const PublicSurvey = lazy(() =>
  import('./pages/PublicSurvey.js').then((m) => ({ default: m.PublicSurvey })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const ResponseDetail = lazy(() =>
  import('./pages/ResponseDetail.js').then((m) => ({ default: m.ResponseDetail })),
)
const Responses = lazy(() => import('./pages/Responses.js').then((m) => ({ default: m.Responses })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SurveyDetail = lazy(() =>
  import('./pages/SurveyDetail.js').then((m) => ({ default: m.SurveyDetail })),
)
const Surveys = lazy(() => import('./pages/Surveys.js').then((m) => ({ default: m.Surveys })))
const Templates = lazy(() => import('./pages/Templates.js').then((m) => ({ default: m.Templates })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ThankYou = lazy(() => import('./pages/ThankYou.js').then((m) => ({ default: m.ThankYou })))

export function App() {
  return (
    <RootErrorBoundary>
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
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/s/:slug" element={<PublicSurvey />} />
              <Route path="/s/:slug/thank-you" element={<ThankYou />} />
              <Route element={<AuthGuard />}>
                <Route
                  path="/surveys"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Surveys />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/surveys/:id"
                  element={
                    <SurveyFeedbackToolLayout>
                      <SurveyDetail />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/surveys/:id/build"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Builder />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/surveys/:id/responses"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Responses />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/surveys/:id/responses/:responseId"
                  element={
                    <SurveyFeedbackToolLayout>
                      <ResponseDetail />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/surveys/:id/analytics"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Analytics />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/templates"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Templates />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Settings />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Profile />
                    </SurveyFeedbackToolLayout>
                  }
                />
                <Route
                  path="/notifications"
                  element={
                    <SurveyFeedbackToolLayout>
                      <Notifications />
                    </SurveyFeedbackToolLayout>
                  }
                />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
