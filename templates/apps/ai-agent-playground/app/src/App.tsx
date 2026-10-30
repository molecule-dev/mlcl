import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NeuronLayout } from './components/NeuronLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AgentBuilder = lazy(() =>
  import('./pages/AgentBuilder.js').then((m) => ({ default: m.AgentBuilder })),
)
const Agents = lazy(() => import('./pages/Agents.js').then((m) => ({ default: m.Agents })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Datasets = lazy(() => import('./pages/Datasets.js').then((m) => ({ default: m.Datasets })))
const ExecutionTrace = lazy(() =>
  import('./pages/ExecutionTrace.js').then((m) => ({ default: m.ExecutionTrace })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const KnowledgeBases = lazy(() =>
  import('./pages/KnowledgeBases.js').then((m) => ({ default: m.KnowledgeBases })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Models = lazy(() => import('./pages/Models.js').then((m) => ({ default: m.Models })))
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
const PromptEditor = lazy(() =>
  import('./pages/PromptEditor.js').then((m) => ({ default: m.PromptEditor })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const RunHistory = lazy(() =>
  import('./pages/RunHistory.js').then((m) => ({ default: m.RunHistory })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ToolLibrary = lazy(() =>
  import('./pages/ToolLibrary.js').then((m) => ({ default: m.ToolLibrary })),
)
export function App() {
  return (
    <BrowserRouter
      // Keep this: React Router 8 otherwise changes the URL before the new page renders,
      // so code and tests that check the page right after a navigation see the old one.
      useTransitions={false}
    >
      <MoleculeProvider
        auth={authClient}
        http={getHttpClient()}
        i18n={i18nProvider}
        storage={getStorageProvider()}
        theme={themeProvider}
      >
        <RootErrorBoundary>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
