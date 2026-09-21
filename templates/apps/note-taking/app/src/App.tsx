import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { VersoLayout } from './components/VersoLayout.js'
import { About } from './pages/About.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Graph } from './pages/Graph.js'
import { Home } from './pages/Home.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NoteEditor } from './pages/NoteEditor.js'
import { Notes } from './pages/Notes.js'
import { PlanUpdated } from './pages/PlanUpdated.js'
import { Pricing } from './pages/Pricing.js'
import { Privacy } from './pages/Privacy.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Search } from './pages/Search.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { Tags } from './pages/Tags.js'
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
            <Route element={<VersoLayout />}>
              <Route path="/home" element={<Home />} />
              <Route path="/notes" element={<Notes />} />
              <Route path="/notes/:id" element={<NoteEditor />} />
              <Route path="/search" element={<Search />} />
              <Route path="/graph" element={<Graph />} />
              <Route path="/tags" element={<Tags />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/plan-updated" element={<PlanUpdated />} />
            </Route>
          </Route>
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
