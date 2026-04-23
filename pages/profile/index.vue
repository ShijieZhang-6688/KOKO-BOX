<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import ProfilePage from '../../src/pages/ProfilePage.vue'

useWechatShare({
  path: '/pages/profile/index',
  query: {
    from: 'share',
    page: 'profile',
  },
})
</script>

<template>
  <PageScaffold>
    <ProfilePage />
  </PageScaffold>
</template>
