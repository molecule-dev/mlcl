<script setup lang="ts">
import { getClassMap } from '@molecule/app-ui'
import { Flex } from '@molecule/app-ui-vue'
import ThemeToggle from './ThemeToggle.vue'
import UserMenu from './UserMenu.vue'
import { APP_NAME, LOGO_SIZE } from '../branding.js'

const cm = getClassMap()
</script>

<template>
  <header :class="cm.headerBar">
    <div :class="cm.headerInner">
      <Flex align="center" justify="between" :class="cm.h('full')">
        <RouterLink to="/">
          <Flex align="center" gap="xs">
            <img src="/logo.svg" :width="LOGO_SIZE" :height="LOGO_SIZE" alt="" />
            <span :class="cm.logoText">{{ APP_NAME }}</span>
          </Flex>
        </RouterLink>
        <Flex align="center" gap="sm">
          <ThemeToggle />
          <UserMenu />
        </Flex>
      </Flex>
    </div>
  </header>
</template>
