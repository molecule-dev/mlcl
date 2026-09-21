import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { SmartHomeDashboardLayout } from './components/SmartHomeDashboardLayout.js'
import { About } from './pages/About.js'
import { Activity } from './pages/Activity.js'
import { AddDevice } from './pages/AddDevice.js'
import { AutomationEditor } from './pages/AutomationEditor.js'
import { Automations } from './pages/Automations.js'
import { DeviceDetail } from './pages/DeviceDetail.js'
import { Energy } from './pages/Energy.js'
import { Floorplan } from './pages/Floorplan.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Overview } from './pages/Overview.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { RoomDetail } from './pages/RoomDetail.js'
import { Rooms } from './pages/Rooms.js'
import { Scenes } from './pages/Scenes.js'
import { Security } from './pages/Security.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'

export function App() {
  return (
    <RootErrorBoundary>
      <BrowserRouter>
        <MoleculeProvider
          auth={authClient}
          http={getHttpClient()}
          theme={themeProvider}
          storage={getStorageProvider()}
          i18n={i18nProvider}
        >
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
        </MoleculeProvider>
      </BrowserRouter>
    </RootErrorBoundary>
  )
}
