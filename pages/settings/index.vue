<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import SettingsPage from '../../src/pages/SettingsPage.vue'

useWechatShare({
  path: '/pages/settings/index',
  query: {
    from: 'share',
    page: 'settings',
  },
})
</script>

<template>
  <PageScaffold>
    <SettingsPage />
  </PageScaffold>
</template>
