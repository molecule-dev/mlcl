import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { About } from './pages/About.js'
import { AdminDashboardPage } from './pages/AdminDashboardPage.js'
import { AdminOrdersPage } from './pages/AdminOrdersPage.js'
import { AdminProductsPage } from './pages/AdminProductsPage.js'
import { AdminSettingsPage } from './pages/AdminSettingsPage.js'
import { CartPage } from './pages/CartPage.js'
import { CategoryPage } from './pages/CategoryPage.js'
import { CheckoutPage } from './pages/CheckoutPage.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Help } from './pages/Help.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { OrderDetailPage } from './pages/OrderDetailPage.js'
import { OrdersPage } from './pages/OrdersPage.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ProductDetailPage } from './pages/ProductDetailPage.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { SearchPage } from './pages/SearchPage.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { StorefrontPage } from './pages/StorefrontPage.js'
import { Terms } from './pages/Terms.js'
import { WishlistPage } from './pages/WishlistPage.js'
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
        <RootErrorBoundary>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Public storefront */}
            <Route path="/" element={<StorefrontPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />

            {/* Authenticated checkout + admin */}
            <Route element={<AuthGuard />}>
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:id" element={<OrderDetailPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/products" element={<AdminProductsPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>

            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/help" element={<Help />} />
            <Route path="/about" element={<About />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
