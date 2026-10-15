import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SurveyFeedbackToolLayout } from './components/SurveyFeedbackToolLayout.js'
import { About } from './pages/About.js'
import { Analytics } from './pages/Analytics.js'
import { Builder } from './pages/Builder.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { PublicSurvey } from './pages/PublicSurvey.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { ResponseDetail } from './pages/ResponseDetail.js'
import { Responses } from './pages/Responses.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { SurveyDetail } from './pages/SurveyDetail.js'
import { Surveys } from './pages/Surveys.js'
import { Templates } from './pages/Templates.js'
import { Terms } from './pages/Terms.js'
import { ThankYou } from './pages/ThankYou.js'

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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
