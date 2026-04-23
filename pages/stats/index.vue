<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import StatsPage from '../../src/pages/StatsPage.vue'

useWechatShare({
  path: '/pages/stats/index',
  query: {
    from: 'share',
    page: 'stats',
  },
})
</script>

<template>
  <PageScaffold>
    <StatsPage />
  </PageScaffold>
</template>
