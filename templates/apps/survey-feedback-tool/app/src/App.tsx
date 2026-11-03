import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SurveyFeedbackToolLayout } from './components/SurveyFeedbackToolLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazyPage(() =>
  import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })),
)
const Builder = lazyPage(() => import('./pages/Builder.js').then((m) => ({ default: m.Builder })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
)
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const PublicSurvey = lazyPage(() =>
  import('./pages/PublicSurvey.js').then((m) => ({ default: m.PublicSurvey })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const ResponseDetail = lazyPage(() =>
  import('./pages/ResponseDetail.js').then((m) => ({ default: m.ResponseDetail })),
)
const Responses = lazyPage(() =>
  import('./pages/Responses.js').then((m) => ({ default: m.Responses })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const SurveyDetail = lazyPage(() =>
  import('./pages/SurveyDetail.js').then((m) => ({ default: m.SurveyDetail })),
)
const Surveys = lazyPage(() => import('./pages/Surveys.js').then((m) => ({ default: m.Surveys })))
const Templates = lazyPage(() =>
  import('./pages/Templates.js').then((m) => ({ default: m.Templates })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ThankYou = lazyPage(() =>
  import('./pages/ThankYou.js').then((m) => ({ default: m.ThankYou })),
)

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          awaitSession
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
