import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { MeridianLayout } from './components/MeridianLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazyPage(() =>
  import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })),
)
const Documents = lazyPage(() =>
  import('./pages/Documents.js').then((m) => ({ default: m.Documents })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Immunizations = lazyPage(() =>
  import('./pages/Immunizations.js').then((m) => ({ default: m.Immunizations })),
)
const InviteShare = lazyPage(() =>
  import('./pages/InviteShare.js').then((m) => ({ default: m.InviteShare })),
)
const LabResultDetail = lazyPage(() =>
  import('./pages/LabResultDetail.js').then((m) => ({ default: m.LabResultDetail })),
)
const LabResults = lazyPage(() =>
  import('./pages/LabResults.js').then((m) => ({ default: m.LabResults })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MedicationDetail = lazyPage(() =>
  import('./pages/MedicationDetail.js').then((m) => ({ default: m.MedicationDetail })),
)
const Medications = lazyPage(() =>
  import('./pages/Medications.js').then((m) => ({ default: m.Medications })),
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
const RecordDetail = lazyPage(() =>
  import('./pages/RecordDetail.js').then((m) => ({ default: m.RecordDetail })),
)
const Records = lazyPage(() => import('./pages/Records.js').then((m) => ({ default: m.Records })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Sharing = lazyPage(() => import('./pages/Sharing.js').then((m) => ({ default: m.Sharing })))
const SharingAccept = lazyPage(() =>
  import('./pages/SharingAccept.js').then((m) => ({ default: m.SharingAccept })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const VisitDetail = lazyPage(() =>
  import('./pages/VisitDetail.js').then((m) => ({ default: m.VisitDetail })),
)
const Visits = lazyPage(() => import('./pages/Visits.js').then((m) => ({ default: m.Visits })))
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
