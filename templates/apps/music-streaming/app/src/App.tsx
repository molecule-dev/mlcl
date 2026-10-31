import { Suspense } from 'react'
import { Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { RootErrorBoundary } from '@molecule/app-root-error-boundary-react'
import { BrowserRouter, lazyPage } from '@molecule/app-routing-react-router'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { ReverbLayout } from './components/ReverbLayout.js'
import { PlayerProvider } from './lib/player.js'

const About = lazyPage(() => import('./pages/About.js').then((m) => ({ default: m.About })))
const AlbumDetail = lazyPage(() =>
  import('./pages/AlbumDetail.js').then((m) => ({ default: m.AlbumDetail })),
)
const ArtistDetail = lazyPage(() =>
  import('./pages/ArtistDetail.js').then((m) => ({ default: m.ArtistDetail })),
)
const ForgotPassword = lazyPage(() =>
  import('./pages/ForgotPassword.js').then((m) => ({ default: m.ForgotPassword })),
)
const Home = lazyPage(() => import('./pages/Home.js').then((m) => ({ default: m.Home })))
const Landing = lazyPage(() => import('./pages/Landing.js').then((m) => ({ default: m.Landing })))
const Library = lazyPage(() => import('./pages/Library.js').then((m) => ({ default: m.Library })))
const LikedSongs = lazyPage(() =>
  import('./pages/LikedSongs.js').then((m) => ({ default: m.LikedSongs })),
)
const Login = lazyPage(() => import('./pages/Login.js').then((m) => ({ default: m.Login })))
const Notifications = lazyPage(() =>
  import('./pages/Notifications.js').then((m) => ({ default: m.Notifications })),
)
const NowPlaying = lazyPage(() =>
  import('./pages/NowPlaying.js').then((m) => ({ default: m.NowPlaying })),
)
const PlanUpdated = lazyPage(() =>
  import('./pages/PlanUpdated.js').then((m) => ({ default: m.PlanUpdated })),
)
const PlaylistDetail = lazyPage(() =>
  import('./pages/PlaylistDetail.js').then((m) => ({ default: m.PlaylistDetail })),
)
const Pricing = lazyPage(() => import('./pages/Pricing.js').then((m) => ({ default: m.Pricing })))
const Privacy = lazyPage(() => import('./pages/Privacy.js').then((m) => ({ default: m.Privacy })))
const Profile = lazyPage(() => import('./pages/Profile.js').then((m) => ({ default: m.Profile })))
const Queue = lazyPage(() => import('./pages/Queue.js').then((m) => ({ default: m.Queue })))
const Radio = lazyPage(() => import('./pages/Radio.js').then((m) => ({ default: m.Radio })))
const ResetPassword = lazyPage(() =>
  import('./pages/ResetPassword.js').then((m) => ({ default: m.ResetPassword })),
)
const Search = lazyPage(() => import('./pages/Search.js').then((m) => ({ default: m.Search })))
const Settings = lazyPage(() =>
  import('./pages/Settings.js').then((m) => ({ default: m.Settings })),
)
const Signup = lazyPage(() => import('./pages/Signup.js').then((m) => ({ default: m.Signup })))
const Subscription = lazyPage(() =>
  import('./pages/Subscription.js').then((m) => ({ default: m.Subscription })),
)
const Terms = lazyPage(() => import('./pages/Terms.js').then((m) => ({ default: m.Terms })))
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
          <PlayerProvider>
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
                  <Route element={<ReverbLayout />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/search" element={<Search />} />
                    <Route path="/library" element={<Library />} />
                    <Route path="/library/liked" element={<LikedSongs />} />
                    <Route path="/playlists/:id" element={<PlaylistDetail />} />
                    <Route path="/albums/:id" element={<AlbumDetail />} />
                    <Route path="/artists/:id" element={<ArtistDetail />} />
                    <Route path="/radio" element={<Radio />} />
                    <Route path="/now-playing" element={<NowPlaying />} />
                    <Route path="/profile/:handle" element={<Profile />} />
                    <Route path="/subscription" element={<Subscription />} />
                    <Route path="/queue" element={<Queue />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/plan-updated" element={<PlanUpdated />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </PlayerProvider>
        </RootErrorBoundary>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
