import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { AuthGuard } from '@molecule/app-ui-react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AdminDashboardPage = lazyPage(() =>
  import('./pages/AdminDashboardPage.js').then((m) => ({ default: m.AdminDashboardPage })),
)
const AdminOrdersPage = lazyPage(() =>
  import('./pages/AdminOrdersPage.js').then((m) => ({ default: m.AdminOrdersPage })),
)
const AdminProductsPage = lazyPage(() =>
  import('./pages/AdminProductsPage.js').then((m) => ({ default: m.AdminProductsPage })),
)
const AdminSettingsPage = lazyPage(() =>
  import('./pages/AdminSettingsPage.js').then((m) => ({ default: m.AdminSettingsPage })),
)
const CartPage = lazyPage(() =>
  import('./pages/CartPage.js').then((m) => ({ default: m.CartPage })),
)
const CategoryPage = lazyPage(() =>
  import('./pages/CategoryPage.js').then((m) => ({ default: m.CategoryPage })),
)
const CheckoutPage = lazyPage(() =>
  import('./pages/CheckoutPage.js').then((m) => ({ default: m.CheckoutPage })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Help = lazyPage(() => import('./pages/Help.js').then((m) => ({ default: m.Help })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const OrderDetailPage = lazyPage(() =>
  import('./pages/OrderDetailPage.js').then((m) => ({ default: m.OrderDetailPage })),
)
const OrdersPage = lazyPage(() =>
  import('./pages/OrdersPage.js').then((m) => ({ default: m.OrdersPage })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProductDetailPage = lazyPage(() =>
  import('./pages/ProductDetailPage.js').then((m) => ({ default: m.ProductDetailPage })),
)
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const SearchPage = lazyPage(() =>
  import('./pages/SearchPage.js').then((m) => ({ default: m.SearchPage })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const StorefrontPage = lazyPage(() =>
  import('./pages/StorefrontPage.js').then((m) => ({ default: m.StorefrontPage })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WishlistPage = lazyPage(() =>
  import('./pages/WishlistPage.js').then((m) => ({ default: m.WishlistPage })),
)
export function App() {
  return (
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
