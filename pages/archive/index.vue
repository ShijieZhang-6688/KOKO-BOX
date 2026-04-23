<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import ArchivePage from '../../src/pages/ArchivePage.vue'

useWechatShare({
  path: '/pages/archive/index',
  query: {
    from: 'share',
    page: 'archive',
  },
})
</script>

<template>
  <PageScaffold>
    <ArchivePage />
  </PageScaffold>
</template>
