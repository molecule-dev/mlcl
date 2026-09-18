<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { Container } from '@molecule/app-ui-vue'
import Header from './Header.vue'
import Footer from './Footer.vue'

const cm = getClassMap()
</script>

<template>
  <div :class="cm.cn(cm.page, cm.appLayout)">
    <Header />
    <main>
      <Container max-width="xl">
        <RouterView />
      </Container>
    </main>
    <Footer />
  </div>
</template>
