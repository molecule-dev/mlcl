import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminDashboardPage.js').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminOrdersPage = lazy(() =>
  import('./pages/AdminOrdersPage.js').then((m) => ({ default: m.AdminOrdersPage })),
)
const AdminProductsPage = lazy(() =>
  import('./pages/AdminProductsPage.js').then((m) => ({ default: m.AdminProductsPage })),
)
const AdminSettingsPage = lazy(() =>
  import('./pages/AdminSettingsPage.js').then((m) => ({ default: m.AdminSettingsPage })),
)
const CartPage = lazy(() => import('./pages/CartPage.js').then((m) => ({ default: m.CartPage })))
const CategoryPage = lazy(() =>
  import('./pages/CategoryPage.js').then((m) => ({ default: m.CategoryPage })),
)
const CheckoutPage = lazy(() =>
  import('./pages/CheckoutPage.js').then((m) => ({ default: m.CheckoutPage })),
)
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazy(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazy(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderDetailPage = lazy(() =>
  import('./pages/OrderDetailPage.js').then((m) => ({ default: m.OrderDetailPage })),
)
const OrdersPage = lazy(() =>
  import('./pages/OrdersPage.js').then((m) => ({ default: m.OrdersPage })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProductDetailPage = lazy(() =>
  import('./pages/ProductDetailPage.js').then((m) => ({ default: m.ProductDetailPage })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SearchPage = lazy(() =>
  import('./pages/SearchPage.js').then((m) => ({ default: m.SearchPage })),
)
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const StorefrontPage = lazy(() =>
  import('./pages/StorefrontPage.js').then((m) => ({ default: m.StorefrontPage })),
)
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WishlistPage = lazy(() =>
  import('./pages/WishlistPage.js').then((m) => ({ default: m.WishlistPage })),
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
        <RootErrorBoundary>
          <Suspense fallback={null}>
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
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
