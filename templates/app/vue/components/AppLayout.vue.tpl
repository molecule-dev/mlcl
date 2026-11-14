<script setup lang="ts">
import { AppShellLayout } from '@molecule/app-shell-layout-vue'

import Footer from './Footer.vue'
import Header from './Header.vue'
</script>

<template>
  <!-- This component is the layout of a nested route subtree: render <RouterView />
      where the page belongs. A nested route's component is not given the child routes
      as content; replacing RouterView with a static slot leaves every page empty while
      the header and footer still render. -->
  <AppShellLayout>
    <template #header>
      <Header />
    </template>
    <template #footer>
      <Footer />
    </template>
    <RouterView />
  </AppShellLayout>
</template>
