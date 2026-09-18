import { Outlet } from 'react-router'
import { Container } from '@molecule/app-ui-react-native'
import { getClassMap } from '@molecule/app-ui'
import { Header } from './Header.js'
import { Footer } from './Footer.js'

export function AppLayout() {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.page, cm.appLayout)}>
      <Header />
      <main>
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </main>
      <Footer />
    </div>
  )
}
