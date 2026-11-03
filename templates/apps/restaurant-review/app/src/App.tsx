import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { RestaurantReviewLayout } from './components/RestaurantReviewLayout.js'
import { RootErrorBoundary } from './components/RootErrorBoundary.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const Discover = lazyPage(() =>
  import('./pages/Discover.js').then((m) => ({ default: m.Discover })),
)
const EditReview = lazyPage(() =>
  import('./pages/EditReview.js').then((m) => ({ default: m.EditReview })),
)
const Favorites = lazyPage(() =>
  import('./pages/Favorites.js').then((m) => ({ default: m.Favorites })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const ListDetail = lazyPage(() =>
  import('./pages/ListDetail.js').then((m) => ({ default: m.ListDetail })),
)
const Lists = lazyPage(() => import('./pages/Lists.js').then((m) => ({ default: m.Lists })))
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const MyReviews = lazyPage(() =>
  import('./pages/MyReviews.js').then((m) => ({ default: m.MyReviews })),
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
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const RestaurantDetail = lazyPage(() =>
  import('./pages/RestaurantDetail.js').then((m) => ({ default: m.RestaurantDetail })),
)
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
const WriteReview = lazyPage(() =>
  import('./pages/WriteReview.js').then((m) => ({ default: m.WriteReview })),
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
              <Route path="/plan-updated" element={<PlanUpdated />} />
              <Route path="/about" element={<About />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              <Route element={<AuthGuard />}>
                <Route element={<RestaurantReviewLayout />}>
                  <Route path="/discover" element={<Discover />} />
                  <Route path="/restaurants/:id" element={<RestaurantDetail />} />
                  <Route path="/restaurants/:id/review" element={<WriteReview />} />
                  <Route path="/reviews/:id/edit" element={<EditReview />} />
                  <Route path="/my-reviews" element={<MyReviews />} />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path="/lists" element={<Lists />} />
                  <Route path="/lists/:id" element={<ListDetail />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/users/:id" element={<Profile />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
