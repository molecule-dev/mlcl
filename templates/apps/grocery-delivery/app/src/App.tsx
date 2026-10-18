import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'
import { lazy, Suspense } from 'react'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { GroceryDeliveryLayout } from './components/GroceryDeliveryLayout.js'

const About = lazy(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Cart = lazy(() => import('./pages/Cart.js').then((m) => ({ default: m.Cart })))
const Checkout = lazy(() => import('./pages/Checkout.js').then((m) => ({ default: m.Checkout })))
const ForgotPassword = lazy(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazy(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Lists = lazy(() => import('./pages/Lists.js').then((m) => ({ default: m.Lists })))
const Login = lazy(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const OrderConfirmation = lazy(() =>
  import('./pages/OrderConfirmation.js').then((m) => ({ default: m.OrderConfirmation })),
)
const Orders = lazy(() => import('./pages/Orders.js').then((m) => ({ default: m.Orders })))
const OrderTracking = lazy(() =>
  import('./pages/OrderTracking.js').then((m) => ({ default: m.OrderTracking })),
)
const PlanUpdated = lazy(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const Pricing = lazy(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazy(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const ProductDetail = lazy(() =>
  import('./pages/ProductDetail.js').then((m) => ({ default: m.ProductDetail })),
)
const ResetPassword = lazy(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazy(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazy(() => import('./pages/Settings.js').then((m) => ({ default: m.Settings })))
const Shop = lazy(() => import('./pages/Shop.js').then((m) => ({ default: m.Shop })))
const Signup = lazy(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazy(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
              {/* Public routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Authenticated routes (wrapped in GroceryDeliveryLayout via AuthGuard) */}
              <Route element={<AuthGuard />}>
                <Route element={<GroceryDeliveryLayout />}>
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order/:id" element={<OrderTracking />} />
                  <Route path="/order/:id/confirmation" element={<OrderConfirmation />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/lists" element={<Lists />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/plan-updated" element={<PlanUpdated />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
