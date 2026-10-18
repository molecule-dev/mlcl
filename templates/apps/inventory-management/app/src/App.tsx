import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { InventoryManagementLayout } from './components/InventoryManagementLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Dashboard = lazy(() => import('./pages/Dashboard.js').then((m) => ({ default: m.Dashboard })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Inventory = lazy(() => import('./pages/Inventory.js').then((m) => ({ default: m.Inventory })))
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const NotFound = lazy(() => import('./pages/NotFound.js').then((m) => ({ default: m.NotFound })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderDetail = lazy(() =>
  import('./pages/OrderDetail.js').then((m) => ({ default: m.OrderDetail })),
)
const Orders = lazy(() => import('./pages/Orders.js').then((m) => ({ default: m.Orders })))
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProductDetail = lazy(() =>
  import('./pages/ProductDetail.js').then((m) => ({ default: m.ProductDetail })),
)
const Profile = lazy(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Reports = lazy(() => import('./pages/Reports.js').then((m) => ({ default: m.Reports })))
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const StockTransfer = lazy(() =>
  import('./pages/StockTransfer.js').then((m) => ({ default: m.StockTransfer })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WarehouseDetail = lazy(() =>
  import('./pages/WarehouseDetail.js').then((m) => ({ default: m.WarehouseDetail })),
)
const Warehouses = lazy(() =>
  import('./pages/Warehouses.js').then((m) => ({ default: m.Warehouses })),
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
                <Route element={<InventoryManagementLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/warehouses" element={<Warehouses />} />
                  <Route path="/warehouses/:id" element={<WarehouseDetail />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/orders/:id" element={<OrderDetail />} />
                  <Route path="/transfers" element={<StockTransfer />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>
                {/* Renders its own Header/Footer chrome, so it lives outside the sidebar layout */}
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
