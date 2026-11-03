import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PrismLayout } from './components/PrismLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const APIKeys = lazyPage(() => import('./pages/APIKeys.js').then((m) => ({ default: m.APIKeys })))
const APIPlayground = lazyPage(() =>
  import('./pages/APIPlayground.js').then((m) => ({ default: m.APIPlayground })),
)
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Changelog = lazyPage(() =>
  import('./pages/Changelog.js').then((m) => ({ default: m.Changelog })),
)
const DocsHome = lazyPage(() =>
  import('./pages/DocsHome.js').then((m) => ({ default: m.DocsHome })),
)
const EndpointReference = lazyPage(() =>
  import('./pages/EndpointReference.js').then((m) => ({ default: m.EndpointReference })),
)
const Endpoints = lazyPage(() =>
  import('./pages/Endpoints.js').then((m) => ({ default: m.Endpoints })),
)
const Errors = lazyPage(() => import('./pages/Errors.js').then((m) => ({ default: m.Errors })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const GuideDetail = lazyPage(() =>
  import('./pages/GuideDetail.js').then((m) => ({ default: m.GuideDetail })),
)
const Guides = lazyPage(() => import('./pages/Guides.js').then((m) => ({ default: m.Guides })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
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
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SDKs = lazyPage(() => import('./pages/SDKs.js').then((m) => ({ default: m.SDKs })))
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Status = lazyPage(() => import('./pages/Status.js').then((m) => ({ default: m.Status })))
const Team = lazyPage(() => import('./pages/Team.js').then((m) => ({ default: m.Team })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Webhooks = lazyPage(() =>
  import('./pages/Webhooks.js').then((m) => ({ default: m.Webhooks })),
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
