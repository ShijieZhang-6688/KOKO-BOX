<script setup lang="ts">
import PageScaffold from '../../src/components/PageScaffold.vue'
import { useWechatShare } from '../../src/composables/useWechatShare'
import ChatPage from '../../src/pages/ChatPage.vue'

useWechatShare({
  path: '/pages/chat/index',
  query: {
    from: 'share',
    page: 'chat',
  },
})
</script>

<template>
  <PageScaffold>
    <ChatPage />
  </PageScaffold>
</template>
