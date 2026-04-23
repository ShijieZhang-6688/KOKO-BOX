<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { isWechatCloudConfigured } from '../config/cloud'
import { useAuth } from '../composables/useAuth'
import { useKokoState } from '../composables/useKokoState'

const { user, pet: authPet, loading, error, isMockSession, isLoggedIn, login, syncUserProfile, importWechatProfile } = useAuth()
const { pet, weeklyCompletionRate, syncPetFromAuth } = useKokoState()

const displayName = computed(() => user.value?.nickName || 'Koko Friend')
const profileInitial = computed(() => displayName.value.trim().charAt(0).toUpperCase() || 'K')

const accountTone = computed(() => {
  if (loading.value) {
    return 'loading'
  }

  if (isLoggedIn.value) {
    return isMockSession.value ? 'preview' : 'linked'
  }

  return error.value ? 'warning' : 'idle'
})

const accountStatusLabel = computed(() => {
  if (loading.value) {
    return '连接中'
  }

  if (isLoggedIn.value) {
    return isMockSession.value ? '预览模式' : '微信已连接'
  }

  return isWechatCloudConfigured() ? '等待连接' : '本地预览'
})

const accountStatusHint = computed(() => {
  if (loading.value) {
    return '正在同步你的账户和宠物资料。'
  }

  if (isLoggedIn.value) {
    return isMockSession.value ? '当前是演示数据，你仍然可以继续体验主要功能。' : '头像昵称已和当前小程序账户同步。'
  }

  return error.value ? '登录遇到一点问题，可以在这里直接重试。' : '你可以继续编辑昵称，稍后再重新连接。'
})

const shouldShowRetry = computed(() => Boolean(error.value) || (!loading.value && !isLoggedIn.value && isWechatCloudConfigured()))

const profileMetrics = computed(() => [
  { label: '心情', value: pet.value.mood },
  { label: '亲密度', value: pet.value.intimacy },
  { label: '本周完成度', value: weeklyCompletionRate.value },
])

const openPage = (url: string) => {
  uni.navigateTo({ url })
}

const handleLogin = () => {
  void login()
}

const handleNicknameBlur = (event: { detail?: { value?: string } }) => {
  const nickName = event.detail?.value?.trim()

  if (nickName && nickName !== user.value?.nickName) {
    void syncUserProfile({ nickName })
  }
}

const handleChooseAvatar = (event: { detail?: { avatarUrl?: string } }) => {
  const avatarFilePath = event.detail?.avatarUrl

  if (avatarFilePath) {
    void importWechatProfile({
      nickName: user.value?.nickName,
      avatarFilePath,
    })
  }
}

watch(
  () => authPet.value,
  (value) => {
    syncPetFromAuth(value ?? undefined)
  },
  { immediate: true },
)

onMounted(() => {
  void login()
})
</script>

<template>
  <view class="profile-page profile-page--light">
    <view class="profile-card-main">
      <view class="profile-card-main__top">
        <view class="profile-card-main__copy">
          <view class="profile-card-main__eyebrow">个人中心</view>
          <view class="profile-card-main__title">账户、设置和宠物状态都在这里</view>
          <view class="profile-card-main__subtitle">保持信息简单清楚，随时继续陪伴和养成。</view>
        </view>
        <view class="profile-card-main__pet-chip">
          <view>{{ pet.name }}</view>
          <view>{{ pet.stage }}</view>
        </view>
      </view>

      <view class="profile-identity-card">
        <button class="profile-avatar profile-avatar-button" open-type="chooseAvatar" @chooseavatar="handleChooseAvatar">
          <image v-if="user?.avatarUrl" :src="user.avatarUrl" mode="aspectFill" />
          <view v-else>{{ profileInitial }}</view>
        </button>

        <view class="profile-identity-card__main">
          <input
            class="profile-name-input"
            type="nickname"
            :value="displayName"
            placeholder="输入你的昵称"
            @blur="handleNicknameBlur"
          />
          <view class="profile-status-tag" :class="`profile-status-tag--${accountTone}`">
            <view class="profile-status-dot" />
            <view>{{ accountStatusLabel }}</view>
          </view>
          <view class="profile-identity-card__hint">{{ accountStatusHint }}</view>
        </view>

        <button v-if="shouldShowRetry" class="profile-inline-button" :disabled="loading" @click="handleLogin">
          {{ loading ? '稍候' : '重试连接' }}
        </button>
      </view>

      <view class="profile-pet-summary">
        <view>
          <view class="profile-section-kicker">宠物状态</view>
          <view class="profile-pet-summary__title">{{ pet.name }} · {{ pet.state }}</view>
          <view class="profile-pet-summary__copy">当前处于 {{ pet.stage }} 阶段，可以继续照料、聊天和查看成长记录。</view>
        </view>
      </view>

      <view class="profile-meter-list">
        <view v-for="item in profileMetrics" :key="item.label" class="profile-meter-item">
          <view class="profile-meter-item__head">
            <view>{{ item.label }}</view>
            <view>{{ item.value }}{{ item.label === '本周完成度' ? '%' : '' }}</view>
          </view>
          <view class="profile-meter-item__track">
            <view class="profile-meter-item__fill" :style="{ width: `${item.value}%` }" />
          </view>
        </view>
      </view>

      <view v-if="error" class="profile-inline-error">
        {{ error }}
      </view>
    </view>

    <view class="profile-group-card">
      <view class="profile-group-card__title">账户</view>
      <button class="profile-list-row">
        <view class="profile-list-icon profile-list-icon--account">
          <view class="profile-icon-person" />
        </view>
        <view class="profile-list-copy">
          <view>个人信息</view>
          <view>头像、昵称和当前连接状态</view>
        </view>
        <view class="profile-list-value">{{ accountStatusLabel }}</view>
      </button>
      <button class="profile-list-row" @click="handleLogin">
        <view class="profile-list-icon profile-list-icon--sync">
          <view class="profile-icon-sync" />
        </view>
        <view class="profile-list-copy">
          <view>同步账户</view>
          <view>重新获取微信资料或更新当前状态</view>
        </view>
        <view class="profile-list-arrow">></view>
      </button>
    </view>

    <view class="profile-group-card">
      <view class="profile-group-card__title">宠物状态</view>
      <button class="profile-list-row" @click="openPage('/pages/archive/index')">
        <view class="profile-list-icon profile-list-icon--pet">
          <view class="profile-icon-paw" />
        </view>
        <view class="profile-list-copy">
          <view>成长记录</view>
          <view>查看生命档案、里程碑和恢复记录</view>
        </view>
        <view class="profile-list-arrow">></view>
      </button>
      <button class="profile-list-row" @click="openPage('/pages/chat/index')">
        <view class="profile-list-icon profile-list-icon--chat">
          <view class="profile-icon-chat" />
        </view>
        <view class="profile-list-copy">
          <view>继续陪伴</view>
          <view>和 {{ pet.name }} 聊天，保持情绪和亲密度成长</view>
        </view>
        <view class="profile-list-arrow">></view>
      </button>
    </view>

    <view class="profile-group-card">
      <view class="profile-group-card__title">设置</view>
      <button class="profile-list-row" @click="openPage('/pages/settings/index')">
        <view class="profile-list-icon profile-list-icon--settings">
          <view class="profile-icon-sliders" />
        </view>
        <view class="profile-list-copy">
          <view>应用设置</view>
          <view>语言、隐私和 Demo 模式</view>
        </view>
        <view class="profile-list-arrow">></view>
      </button>
      <button class="profile-list-row" @click="openPage('/pages/settings/index')">
        <view class="profile-list-icon profile-list-icon--privacy">
          <view class="profile-icon-shield" />
        </view>
        <view class="profile-list-copy">
          <view>隐私与会话</view>
          <view>管理聊天隐藏、摘要同步和清空记录</view>
        </view>
        <view class="profile-list-arrow">></view>
      </button>
    </view>
  </view>
</template>
