import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AppLayout } from './components/AppLayout.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { Cart } from './pages/Cart.js'
import { Catalog } from './pages/Catalog.js'
import { Checkout } from './pages/Checkout.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { OrderDetail } from './pages/OrderDetail.js'
import { Orders } from './pages/Orders.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Privacy } from './pages/Privacy.js'
import { ProductDetail } from './pages/ProductDetail.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Terms } from './pages/Terms.js'
import { VendorDashboard } from './pages/VendorDashboard.js'
import { VendorOnboarding } from './pages/VendorOnboarding.js'
import { VendorOrders } from './pages/VendorOrders.js'
import { VendorPayouts } from './pages/VendorPayouts.js'
import { VendorProductForm } from './pages/VendorProductForm.js'
import { VendorProducts } from './pages/VendorProducts.js'
import { VendorStorefront } from './pages/VendorStorefront.js'

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
        <Routes>
          {/* Pages that render their own chrome — no shared shell */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/vendor/apply" element={<VendorOnboarding />} />
          <Route element={<AuthGuard />}>
            <Route path="/plan-updated" element={<PlanUpdated />} />
          </Route>

          {/* Public marketing & marketplace browse — under chrome */}
          <Route element={<AppLayout />}>
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/vendors/:slug" element={<VendorStorefront />} />
            <Route path="/about" element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Auth-required shopper & vendor routes */}
            <Route element={<AuthGuard />}>
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />

              {/* Vendor admin */}
              <Route path="/vendor/dashboard" element={<VendorDashboard />} />
              <Route path="/vendor/products" element={<VendorProducts />} />
              <Route path="/vendor/products/new" element={<VendorProductForm />} />
              <Route path="/vendor/products/:productId/edit" element={<VendorProductForm />} />
              <Route path="/vendor/orders" element={<VendorOrders />} />
              <Route path="/vendor/payouts" element={<VendorPayouts />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
