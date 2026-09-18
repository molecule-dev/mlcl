import type { ParentProps } from 'solid-js'
import { Container } from '@molecule/app-ui-solid'
import { getClassMap } from '@molecule/app-ui'
import { Header } from './Header.js'
import { Footer } from './Footer.js'

export function AppLayout(props: ParentProps) {
  const cm = getClassMap()

  return (
    <div class={cm.cn(cm.page, cm.appLayout)}>
      <Header />
      <main>
        <Container maxWidth="xl">
          {props.children}
        </Container>
      </main>
      <Footer />
    </div>
  )
}
