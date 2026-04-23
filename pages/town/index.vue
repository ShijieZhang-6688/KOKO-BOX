<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import TownPage from '../../src/pages/TownPage.vue'

useWechatShare({
  path: '/pages/town/index',
  query: {
    from: 'share',
    page: 'town',
  },
})
</script>

<template>
  <PageScaffold>
    <TownPage />
  </PageScaffold>
</template>
