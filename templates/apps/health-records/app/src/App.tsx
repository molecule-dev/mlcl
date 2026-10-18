import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { MeridianLayout } from './components/MeridianLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const Documents = lazy(() => import('./pages/Documents.js').then((m) => ({ default: m.Documents })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Immunizations = lazy(() =>
  import('./pages/Immunizations.js').then((m) => ({ default: m.Immunizations })),
)
const InviteShare = lazy(() =>
  import('./pages/InviteShare.js').then((m) => ({ default: m.InviteShare })),
)
const LabResultDetail = lazy(() =>
  import('./pages/LabResultDetail.js').then((m) => ({ default: m.LabResultDetail })),
)
const LabResults = lazy(() =>
  import('./pages/LabResults.js').then((m) => ({ default: m.LabResults })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MedicationDetail = lazy(() =>
  import('./pages/MedicationDetail.js').then((m) => ({ default: m.MedicationDetail })),
)
const Medications = lazy(() =>
  import('./pages/Medications.js').then((m) => ({ default: m.Medications })),
)
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const RecordDetail = lazy(() =>
  import('./pages/RecordDetail.js').then((m) => ({ default: m.RecordDetail })),
)
const Records = lazy(() => import('./pages/Records.js').then((m) => ({ default: m.Records })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Sharing = lazy(() => import('./pages/Sharing.js').then((m) => ({ default: m.Sharing })))
const SharingAccept = lazy(() =>
  import('./pages/SharingAccept.js').then((m) => ({ default: m.SharingAccept })),
)
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const VisitDetail = lazy(() =>
  import('./pages/VisitDetail.js').then((m) => ({ default: m.VisitDetail })),
)
const Visits = lazy(() => import('./pages/Visits.js').then((m) => ({ default: m.Visits })))
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
            {/* Public marketing + auth */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Authenticated app shell — sidebar nav + outlet */}
            <Route element={<AuthGuard />}>
              <Route element={<MeridianLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/records" element={<Records />} />
                <Route path="/records/:id" element={<RecordDetail />} />
                <Route path="/medications" element={<Medications />} />
                <Route path="/medications/:id" element={<MedicationDetail />} />
                <Route path="/labs" element={<LabResults />} />
                <Route path="/labs/:id" element={<LabResultDetail />} />
                <Route path="/immunizations" element={<Immunizations />} />
                <Route path="/visits" element={<Visits />} />
                <Route path="/visits/:id" element={<VisitDetail />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/sharing" element={<Sharing />} />
                <Route path="/sharing/new" element={<InviteShare />} />
                <Route path="/sharing/accept" element={<SharingAccept />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
