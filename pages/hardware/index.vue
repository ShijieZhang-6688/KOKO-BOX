<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import HardwarePage from '../../src/pages/HardwarePage.vue'

useWechatShare({
  path: '/pages/hardware/index',
  query: {
    from: 'share',
    page: 'hardware',
  },
})
</script>

<template>
  <PageScaffold>
    <HardwarePage />
  </PageScaffold>
</template>
