import { BrowserRouter, Route, Routes } from 'react-router'

import { AnalyticsRouteListener } from '@molecule/app-analytics-react'
import { getClient as getHttpClient } from '@molecule/app-http'
import { MoleculeProvider } from '@molecule/app-react'
import { getProvider as getStorageProvider } from '@molecule/app-storage'

import { authClient, i18nProvider, themeProvider } from './bonds/index.js'
import { AuthGuard } from './components/AuthGuard.js'
import { About } from './pages/About.js'
import { AssetDetail } from './pages/AssetDetail.js'
import { AssetLibrary } from './pages/AssetLibrary.js'
import { Dashboard } from './pages/Dashboard.js'
import { Editor } from './pages/Editor.js'
import { ExportDetail } from './pages/ExportDetail.js'
import { ExportQueue } from './pages/ExportQueue.js'
import { ForgotPassword } from './pages/ForgotPassword.js'
import { Landing } from './pages/Landing.js'
import { Login } from './pages/Login.js'
import { NewProject } from './pages/NewProject.js'
import { NotFound } from './pages/NotFound.js'
import { Privacy } from './pages/Privacy.js'
import { ProjectDetail } from './pages/ProjectDetail.js'
import { ResetPassword } from './pages/ResetPassword.js'
import { Settings } from './pages/Settings.js'
import { Signup } from './pages/Signup.js'
import { TemplateDetail } from './pages/TemplateDetail.js'
import { Templates } from './pages/Templates.js'
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
          <Route path="/about" element={<About />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/editor/:id" element={<Editor />} />
            <Route path="/assets" element={<AssetLibrary />} />
            <Route path="/assets/:id" element={<AssetDetail />} />
            <Route path="/export" element={<ExportQueue />} />
            <Route path="/export/:id" element={<ExportDetail />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/:id" element={<TemplateDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/projects/new" element={<NewProject />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </MoleculeProvider>
    </BrowserRouter>
  )
}
