import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { EmployeeOnboardingLayout } from './components/EmployeeOnboardingLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Checklist = lazyPage(() =>
  import('./pages/Checklist.js').then((m) => ({ default: m.Checklist })),
)
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Documents = lazyPage(() =>
  import('./pages/Documents.js').then((m) => ({ default: m.Documents })),
)
const DocumentViewer = lazyPage(() =>
  import('./pages/DocumentViewer.js').then((m) => ({ default: m.DocumentViewer })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
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
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const TaskDetail = lazyPage(() =>
  import('./pages/TaskDetail.js').then((m) => ({ default: m.TaskDetail })),
)
const TeamDirectory = lazyPage(() =>
  import('./pages/TeamDirectory.js').then((m) => ({ default: m.TeamDirectory })),
)
const TeamMemberProfile = lazyPage(() =>
  import('./pages/TeamMemberProfile.js').then((m) => ({ default: m.TeamMemberProfile })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const Timeline = lazyPage(() =>
  import('./pages/Timeline.js').then((m) => ({ default: m.Timeline })),
)
const Training = lazyPage(() =>
  import('./pages/Training.js').then((m) => ({ default: m.Training })),
)
const TrainingModule = lazyPage(() =>
  import('./pages/TrainingModule.js').then((m) => ({ default: m.TrainingModule })),
)
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
