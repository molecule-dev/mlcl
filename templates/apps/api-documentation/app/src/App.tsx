import { BrowserRouter, Route, Routes } from 'react-router'

import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PrismLayout } from './components/PrismLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { About } from './pages/About.js'
import { APIKeys } from './pages/APIKeys.js'
import { APIPlayground } from './pages/APIPlayground.js'
import { Billing } from './pages/Billing.js'
import { Changelog } from './pages/Changelog.js'
import { DocsHome } from './pages/DocsHome.js'
import { EndpointReference } from './pages/EndpointReference.js'
import { Endpoints } from './pages/Endpoints.js'
import { Errors } from './pages/Errors.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { GuideDetail } from './pages/GuideDetail.js'
import { Guides } from './pages/Guides.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SDKs } from './pages/SDKs.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Status } from './pages/Status.js'
import { Team } from './pages/Team.js'
import { Terms } from './pages/Terms.js'
import { Webhooks } from './pages/Webhooks.js'
export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
