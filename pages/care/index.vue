<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import CarePage from '../../src/pages/CarePage.vue'

useWechatShare({
  path: '/pages/care/index',
  query: {
    from: 'share',
    page: 'care',
  },
})
</script>

<template>
  <PageScaffold>
    <CarePage />
  </PageScaffold>
</template>
