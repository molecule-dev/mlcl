import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'
import { WarehouseFulfillmentLayout } from './components/WarehouseFulfillmentLayout.js'
import { About } from './pages/About.js'
import { Dashboard } from './pages/Dashboard.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Inventory } from './pages/Inventory.js'
import { InventoryDetail } from './pages/InventoryDetail.js'
import { Landing } from './pages/Landing.js'
import { Locations } from './pages/Locations.js'
import { Login } from './pages/Login.js'
import { NotFound } from './pages/NotFound.js'
import { Notifications } from './pages/Notifications.js'
import { OrderDetail } from './pages/OrderDetail.js'
import { Orders } from './pages/Orders.js'
import { PickList } from './pages/PickList.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { Receiving } from './pages/Receiving.js'
import { Reports } from './pages/Reports.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Returns } from './pages/Returns.js'
import { Scanner } from './pages/Scanner.js'
import { Settings } from './pages/Settings.js'
import { ShipmentDetail } from './pages/ShipmentDetail.js'
import { Shipments } from './pages/Shipments.js'
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
              <Route path="/scan" element={<Scanner />} />
              <Route element={<WarehouseFulfillmentLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/pick/:id" element={<PickList />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/inventory/:sku" element={<InventoryDetail />} />
                <Route path="/shipments" element={<Shipments />} />
                <Route path="/shipments/:id" element={<ShipmentDetail />} />
                <Route path="/receiving" element={<Receiving />} />
                <Route path="/returns" element={<Returns />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/plan-updated" element={<PlanUpdated />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
