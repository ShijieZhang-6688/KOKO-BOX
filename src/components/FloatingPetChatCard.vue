<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    collapsed?: boolean
    latestMessage: string
    sending?: boolean
  }>(),
  {
    collapsed: false,
    sending: false,
  },
)

const emit = defineEmits<{
  send: [value: string]
  openHistory: []
}>()

const draft = ref('')

const submit = () => {
  const value = draft.value.trim()
  if (!value || props.sending) return
  emit('send', value)
  draft.value = ''
}

watch(
  () => props.collapsed,
  (value) => {
    if (value) {
      draft.value = ''
    }
  },
)
</script>

<template>
  <view class="pet-chat-card" :class="{ 'pet-chat-card--collapsed': collapsed }">
    <view class="pet-chat-card__glow" />
    <view class="pet-chat-card__head">
      <view>
        <view class="pet-chat-card__eyebrow">AI PET LINK</view>
        <view class="pet-chat-card__title">和宠物说句话</view>
      </view>
      <button class="pet-chat-card__history" @click="emit('openHistory')">记录</button>
    </view>

    <view class="pet-chat-card__preview">{{ latestMessage }}</view>

    <view class="pet-chat-card__input">
      <input
        v-model="draft"
        class="pet-chat-card__field"
        :disabled="collapsed"
        placeholder="输入你现在的心情或想说的话"
        confirm-type="send"
        @confirm="submit"
      />
      <button class="pet-chat-card__send" :disabled="collapsed || sending" @click="submit">
        {{ sending ? '发送中' : '发送' }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.pet-chat-card {
  backdrop-filter: blur(14rpx);
  background:
    linear-gradient(180deg, rgba(244, 255, 255, 0.86), rgba(227, 242, 255, 0.94)),
    rgba(232, 246, 255, 0.92);
  border: 2rpx solid rgba(146, 219, 255, 0.46);
  border-radius: 30rpx;
  box-shadow: 0 16rpx 42rpx rgba(44, 96, 130, 0.16);
  overflow: hidden;
  padding: 20rpx 22rpx;
  position: relative;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.pet-chat-card--collapsed {
  opacity: 0.38;
  transform: scale(0.98);
}

.pet-chat-card__glow {
  background: linear-gradient(90deg, rgba(109, 213, 255, 0), rgba(109, 213, 255, 0.58), rgba(109, 213, 255, 0));
  height: 2rpx;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.pet-chat-card__head {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.pet-chat-card__eyebrow {
  color: #79a6c2;
  font-size: 20rpx;
  letter-spacing: 3rpx;
}

.pet-chat-card__title {
  color: #1f3e52;
  font-size: 28rpx;
  font-weight: 700;
  margin-top: 4rpx;
}

.pet-chat-card__history,
.pet-chat-card__send {
  border: none;
  margin: 0;
  padding: 0;
}

.pet-chat-card__history::after,
.pet-chat-card__send::after {
  border: none;
}

.pet-chat-card__history {
  background: rgba(255, 255, 255, 0.78);
  border-radius: 999rpx;
  color: #4d7694;
  font-size: 23rpx;
  padding: 12rpx 22rpx;
}

.pet-chat-card__preview {
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: rgba(31, 62, 82, 0.76);
  display: -webkit-box;
  font-size: 23rpx;
  line-height: 1.55;
  margin-top: 14rpx;
  min-height: 70rpx;
  overflow: hidden;
}

.pet-chat-card__input {
  align-items: center;
  display: flex;
  gap: 12rpx;
  margin-top: 14rpx;
}

.pet-chat-card__field {
  background: rgba(255, 255, 255, 0.74);
  border: 2rpx solid rgba(132, 214, 245, 0.42);
  border-radius: 999rpx;
  color: #244456;
  flex: 1;
  font-size: 25rpx;
  height: 76rpx;
  padding: 0 24rpx;
}

.pet-chat-card__send {
  background: linear-gradient(135deg, #74d7ff, #5baeff);
  border-radius: 999rpx;
  color: #fff;
  font-size: 26rpx;
  font-weight: 700;
  padding: 18rpx 26rpx;
}
</style>
