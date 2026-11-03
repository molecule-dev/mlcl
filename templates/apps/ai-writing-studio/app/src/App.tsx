import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { PlumeSidebarLayout } from './components/PlumeSidebarLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Analytics = lazyPage(() =>
  import('./pages/Analytics.js').then((m) => ({ default: m.Analytics })),
)
const Billing = lazyPage(() => import('./pages/Billing.js').then((m) => ({ default: m.Billing })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Documents = lazyPage(() =>
  import('./pages/Documents.js').then((m) => ({ default: m.Documents })),
)
const Editor = lazyPage(() => import('./pages/Editor.js').then((m) => ({ default: m.Editor })))
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const ImageGeneratorPage = lazyPage(() =>
  import('./pages/ImageGenerator.js').then((m) => ({ default: m.ImageGeneratorPage })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazyPage(() =>
  import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })),
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
const SEOAnalysis = lazyPage(() =>
  import('./pages/SEOAnalysis.js').then((m) => ({ default: m.SEOAnalysis })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Templates = lazyPage(() =>
  import('./pages/Templates.js').then((m) => ({ default: m.Templates })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route element={<AuthGuard />}>
                <Route element={<PlumeSidebarLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/documents/:id" element={<Editor />} />
                  <Route path="/documents/:id/seo" element={<SEOAnalysis />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/image-generator" element={<ImageGeneratorPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/billing" element={<Billing />} />
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
