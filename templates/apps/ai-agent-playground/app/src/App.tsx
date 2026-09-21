import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NeuronLayout } from './components/NeuronLayout.js'
import { About } from './pages/About.js'
import { AgentBuilder } from './pages/AgentBuilder.js'
import { Agents } from './pages/Agents.js'
import { Dashboard } from './pages/Dashboard.js'
import { Datasets } from './pages/Datasets.js'
import { ExecutionTrace } from './pages/ExecutionTrace.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { KnowledgeBases } from './pages/KnowledgeBases.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Models } from './pages/Models.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { PromptEditor } from './pages/PromptEditor.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { RunHistory } from './pages/RunHistory.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { ToolLibrary } from './pages/ToolLibrary.js'
export function App() {
  return (
    <BrowserRouter>
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        i18n={i18nProvider}
        storage={getStorageProvider()}
        theme={themeProvider}
      >
        <RootErrorBoundary>
          <AnalyticsRouteListener />
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
            <Route element={<AuthGuard />}>
              <Route
                element={
                  <NeuronLayout title="Dashboard" ctaLabel="New Agent" ctaTo="/agents/new" />
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
              </Route>
              <Route
                element={<NeuronLayout title="Agents" ctaLabel="New Agent" ctaTo="/agents/new" />}
              >
                <Route path="/agents" element={<Agents />} />
              </Route>
              <Route element={<NeuronLayout title="Agent Builder" />}>
                <Route path="/agents/:id" element={<AgentBuilder />} />
              </Route>
              <Route element={<NeuronLayout title="Prompt Editor" />}>
                <Route path="/agents/:id/prompt" element={<PromptEditor />} />
              </Route>
              <Route element={<NeuronLayout title="Tool Library" />}>
                <Route path="/tools" element={<ToolLibrary />} />
              </Route>
              <Route element={<NeuronLayout title="Run History" />}>
                <Route path="/runs" element={<RunHistory />} />
              </Route>
              <Route element={<NeuronLayout title="Execution Trace" />}>
                <Route path="/runs/:id" element={<ExecutionTrace />} />
              </Route>
              <Route element={<NeuronLayout title="Datasets" />}>
                <Route path="/datasets" element={<Datasets />} />
              </Route>
              <Route element={<NeuronLayout title="Knowledge Bases" />}>
                <Route path="/knowledge-bases" element={<KnowledgeBases />} />
              </Route>
              <Route element={<NeuronLayout title="Models" />}>
                <Route path="/models" element={<Models />} />
              </Route>
              <Route element={<NeuronLayout title="Settings" />}>
                <Route path="/settings" element={<Settings />} />
              </Route>
              <Route element={<NeuronLayout title="Profile" />}>
                <Route path="/profile" element={<Profile />} />
              </Route>
              <Route element={<NeuronLayout title="Notifications" />}>
                <Route path="/notifications" element={<Notifications />} />
              </Route>
              {/* PlanUpdated renders its own public Header/Footer shell, so it
                  sits inside AuthGuard but outside the NeuronLayout chrome. */}
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
