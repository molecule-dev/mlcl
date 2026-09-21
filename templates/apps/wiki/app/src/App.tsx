import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { WikiLayout } from './components/WikiLayout.js'
import { About } from './pages/About.js'
import { Comments } from './pages/Comments.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Home } from './pages/Home.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { Notifications } from './pages/Notifications.js'
import { PageEditor } from './pages/PageEditor.js'
import { PageView } from './pages/PageView.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { Profile } from './pages/Profile.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Spaces } from './pages/Spaces.js'
import { TeamMembers } from './pages/TeamMembers.js'
import { Templates } from './pages/Templates.js'
import { Terms } from './pages/Terms.js'
import { Trash } from './pages/Trash.js'
import { VersionHistory } from './pages/VersionHistory.js'
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
            {/* Standalone authed pages that render their own header/footer
                (ContentPageShell) must sit OUTSIDE WikiLayout to avoid a
                double header/sidebar. */}
            <Route path="/plan-updated" element={<PlanUpdated />} />
            <Route element={<WikiLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/spaces" element={<Spaces />} />
              <Route path="/templates" element={<Templates />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/comments" element={<Comments />} />
              <Route path="/team" element={<TeamMembers />} />
              <Route path="/trash" element={<Trash />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/page/new" element={<PageEditor />} />
              <Route path="/page/:id" element={<PageView />} />
              <Route path="/page/:id/edit" element={<PageEditor />} />
              <Route path="/page/:id/history" element={<VersionHistory />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
