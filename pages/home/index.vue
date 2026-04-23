<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import HomePage from '../../src/pages/HomePage.vue'

useWechatShare({
  path: '/pages/home/index',
  query: {
    from: 'share',
    page: 'home',
  },
})
</script>

<template>
  <PageScaffold>
    <HomePage />
  </PageScaffold>
</template>
