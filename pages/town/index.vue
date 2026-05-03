<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import TownPage from '../../src/pages/TownPage.vue'

const TOWN_INVITE_SHARE_STORAGE_KEY = 'koko-town-share-invite'

useWechatShare({
  path: '/pages/town/index',
  title: () => {
    const invite = typeof uni.getStorageSync === 'function' ? uni.getStorageSync(TOWN_INVITE_SHARE_STORAGE_KEY) : ''
    return invite ? 'Join my Koko Town' : 'Koko Box Town'
  },
  query: () => {
    const invite = typeof uni.getStorageSync === 'function' ? uni.getStorageSync(TOWN_INVITE_SHARE_STORAGE_KEY) : ''
    return {
      from: invite ? 'townInvite' : 'share',
      page: 'town',
      invite: invite || undefined,
    }
  },
})
</script>

<template>
  <PageScaffold>
    <TownPage />
  </PageScaffold>
</template>
