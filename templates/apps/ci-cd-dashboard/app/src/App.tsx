import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ConduitLayout } from './components/ConduitLayout.js'
import { About } from './pages/About.js'
import { Artifacts } from './pages/Artifacts.js'
import { Environments } from './pages/Environments.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Insights } from './pages/Insights.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PipelineDetail } from './pages/PipelineDetail.js'
import { Pipelines } from './pages/Pipelines.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Repositories } from './pages/Repositories.js'
import { RepositoryDetail } from './pages/RepositoryDetail.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        theme={themeProvider}
        storage={getStorageProvider()}
        i18n={i18nProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />

            {/* Authenticated routes (sidebar layout) */}
            <Route element={<AuthGuard />}>
              <Route element={<ConduitLayout />}>
                <Route path="/pipelines" element={<Pipelines />} />
                <Route path="/pipelines/:id" element={<PipelineDetail />} />
                <Route path="/repositories" element={<Repositories />} />
                <Route path="/repositories/:slug" element={<RepositoryDetail />} />
                <Route path="/environments" element={<Environments />} />
                <Route path="/artifacts" element={<Artifacts />} />
                <Route path="/insights" element={<Insights />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
