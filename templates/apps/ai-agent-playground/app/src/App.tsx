import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { NeuronLayout } from './components/NeuronLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AgentBuilder = lazyPage(() =>
  import('./pages/AgentBuilder.js').then((m) => ({ default: m.AgentBuilder })),
)
const Agents = lazyPage(() => import('./pages/Agents.js').then((m) => ({ default: m.Agents })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Datasets = lazyPage(() =>
  import('./pages/Datasets.js').then((m) => ({ default: m.Datasets })),
)
const ExecutionTrace = lazyPage(() =>
  import('./pages/ExecutionTrace.js').then((m) => ({ default: m.ExecutionTrace })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const KnowledgeBases = lazyPage(() =>
  import('./pages/KnowledgeBases.js').then((m) => ({ default: m.KnowledgeBases })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Models = lazyPage(() => import('./pages/Models.js').then((m) => ({ default: m.Models })))
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
const PromptEditor = lazyPage(() =>
  import('./pages/PromptEditor.js').then((m) => ({ default: m.PromptEditor })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const RunHistory = lazyPage(() =>
  import('./pages/RunHistory.js').then((m) => ({ default: m.RunHistory })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const ToolLibrary = lazyPage(() =>
  import('./pages/ToolLibrary.js').then((m) => ({ default: m.ToolLibrary })),
)
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
