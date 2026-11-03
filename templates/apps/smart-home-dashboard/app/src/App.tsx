import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SmartHomeDashboardLayout } from './components/SmartHomeDashboardLayout.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Activity = lazyPage(() =>
  import('./pages/Activity.js').then((m) => ({ default: m.Activity })),
)
const AddDevice = lazyPage(() =>
  import('./pages/AddDevice.js').then((m) => ({ default: m.AddDevice })),
)
const AutomationEditor = lazyPage(() =>
  import('./pages/AutomationEditor.js').then((m) => ({ default: m.AutomationEditor })),
)
const Automations = lazyPage(() =>
  import('./pages/Automations.js').then((m) => ({ default: m.Automations })),
)
const DeviceDetail = lazyPage(() =>
  import('./pages/DeviceDetail.js').then((m) => ({ default: m.DeviceDetail })),
)
const Energy = lazyPage(() => import('./pages/Energy.js').then((m) => ({ default: m.Energy })))
const Floorplan = lazyPage(() =>
  import('./pages/Floorplan.js').then((m) => ({ default: m.Floorplan })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Overview = lazyPage(() =>
  import('./pages/Overview.js').then((m) => ({ default: m.Overview })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const RoomDetail = lazyPage(() =>
  import('./pages/RoomDetail.js').then((m) => ({ default: m.RoomDetail })),
)
const Rooms = lazyPage(() => import('./pages/Rooms.js').then((m) => ({ default: m.Rooms })))
const Scenes = lazyPage(() => import('./pages/Scenes.js').then((m) => ({ default: m.Scenes })))
const Security = lazyPage(() =>
  import('./pages/Security.js').then((m) => ({ default: m.Security })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
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
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route element={<AuthGuard />}>
                <Route element={<SmartHomeDashboardLayout />}>
                  <Route path="/overview" element={<Overview />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/rooms/:id" element={<RoomDetail />} />
                  <Route path="/devices/add" element={<AddDevice />} />
                  <Route path="/devices/:id" element={<DeviceDetail />} />
                  <Route path="/scenes" element={<Scenes />} />
                  <Route path="/automations" element={<Automations />} />
                  <Route path="/automations/:id/edit" element={<AutomationEditor />} />
                  <Route path="/energy" element={<Energy />} />
                  <Route path="/security" element={<Security />} />
                  <Route path="/activity" element={<Activity />} />
                  <Route path="/floorplan" element={<Floorplan />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
