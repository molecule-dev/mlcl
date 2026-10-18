import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EmployeeOnboardingLayout } from './components/EmployeeOnboardingLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Checklist = lazy(() => import('./pages/Checklist.js').then((m) => ({ default: m.Checklist })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Documents = lazy(() => import('./pages/Documents.js').then((m) => ({ default: m.Documents })))
const DocumentViewer = lazy(() =>
  import('./pages/DocumentViewer.js').then((m) => ({ default: m.DocumentViewer })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
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
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TaskDetail = lazy(() =>
  import('./pages/TaskDetail.js').then((m) => ({ default: m.TaskDetail })),
)
const TeamDirectory = lazy(() =>
  import('./pages/TeamDirectory.js').then((m) => ({ default: m.TeamDirectory })),
)
const TeamMemberProfile = lazy(() =>
  import('./pages/TeamMemberProfile.js').then((m) => ({ default: m.TeamMemberProfile })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Timeline = lazy(() => import('./pages/Timeline.js').then((m) => ({ default: m.Timeline })))
const Training = lazy(() => import('./pages/Training.js').then((m) => ({ default: m.Training })))
const TrainingModule = lazy(() =>
  import('./pages/TrainingModule.js').then((m) => ({ default: m.TrainingModule })),
)
export function App() {
  return (
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
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Authed */}
            <Route element={<AuthGuard />}>
              <Route element={<EmployeeOnboardingLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/checklist" element={<Checklist />} />
                <Route path="/checklist/:id" element={<TaskDetail />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/:id" element={<DocumentViewer />} />
                <Route path="/team" element={<TeamDirectory />} />
                <Route path="/team/:id" element={<TeamMemberProfile />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/training" element={<Training />} />
                <Route path="/training/:id" element={<TrainingModule />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
              {/* Renders its own Header/Footer chrome, so it lives outside the sidebar layout */}
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
