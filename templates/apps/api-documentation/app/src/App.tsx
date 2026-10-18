import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PrismLayout } from './components/PrismLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const APIKeys = lazy(() => import('./pages/APIKeys.js').then((m) => ({ default: m.APIKeys })))
const APIPlayground = lazy(() =>
  import('./pages/APIPlayground.js').then((m) => ({ default: m.APIPlayground })),
)
const Billing = lazy(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Changelog = lazy(() => import('./pages/Changelog.js').then((m) => ({ default: m.Changelog })))
const DocsHome = lazy(() => import('./pages/DocsHome.js').then((m) => ({ default: m.DocsHome })))
const EndpointReference = lazy(() =>
  import('./pages/EndpointReference.js').then((m) => ({ default: m.EndpointReference })),
)
const Endpoints = lazy(() => import('./pages/Endpoints.js').then((m) => ({ default: m.Endpoints })))
const Errors = lazy(() => import('./pages/Errors.js').then((m) => ({ default: m.Errors })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GuideDetail = lazy(() =>
  import('./pages/GuideDetail.js').then((m) => ({ default: m.GuideDetail })),
)
const Guides = lazy(() => import('./pages/Guides.js').then((m) => ({ default: m.Guides })))
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
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SDKs = lazy(() => import('./pages/SDKs.js').then((m) => ({ default: m.SDKs })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Status = lazy(() => import('./pages/Status.js').then((m) => ({ default: m.Status })))
const Team = lazy(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Webhooks = lazy(() => import('./pages/Webhooks.js').then((m) => ({ default: m.Webhooks })))
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
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/404" element={<NotFound />} />
              <Route element={<AuthGuard />}>
                <Route element={<PrismLayout />}>
                  <Route path="/docs" element={<DocsHome />} />
                  <Route path="/docs/endpoints" element={<Endpoints />} />
                  <Route path="/docs/endpoints/:id" element={<EndpointReference />} />
                  <Route path="/docs/changelog" element={<Changelog />} />
                  <Route path="/docs/errors" element={<Errors />} />
                  <Route path="/docs/sdks" element={<SDKs />} />
                  <Route path="/docs/guides" element={<Guides />} />
                  <Route path="/docs/guides/:id" element={<GuideDetail />} />
                  <Route path="/docs/webhooks" element={<Webhooks />} />
                  <Route path="/playground" element={<APIPlayground />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/settings/api-keys" element={<APIKeys />} />
                  <Route path="/settings/billing" element={<Billing />} />
                  <Route path="/settings/team" element={<Team />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
