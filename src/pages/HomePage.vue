<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import StatusCard from '../components/StatusCard.vue'
import { useKokoState } from '../composables/useKokoState'
import { useLanguage } from '../composables/useLanguage'
import type { StatKey } from '../i18n'

const { t } = useLanguage()
const { pet, carePet } = useKokoState()
const showGrowthPopup = ref(false)
const petPose = ref<'idle' | 'wave' | 'snack' | 'sleep'>('idle')
const petBubble = ref('Tap Koko to say hi.')

let poseTimer: ReturnType<typeof setTimeout> | undefined

const growthSteps = [
  '蛋期',
  '幼体',
  '成长期',
  '成熟期',
  '守护期',
]

const statColors: Record<StatKey, string> = {
  health: 'var(--mint)',
  mood: 'var(--sun)',
  hunger: 'var(--peach)',
  energy: 'var(--sky)',
  intimacy: 'var(--rose)',
  clean: 'var(--lime)',
}

const statEntries = computed(() => {
  const labels = t.value.stats
  const valueMap: Record<StatKey, number> = {
    health: pet.value.health,
    mood: pet.value.mood,
    hunger: pet.value.hunger,
    energy: pet.value.energy,
    intimacy: pet.value.intimacy,
    clean: pet.value.clean,
  }

  return (Object.keys(valueMap) as StatKey[]).map((key) => ({
    key,
    value: valueMap[key],
    label: labels[key].label,
    hint: labels[key].hint,
    color: statColors[key],
  }))
})

const openPage = (url: string) => {
  uni.navigateTo({ url })
}

const setPetPose = (pose: typeof petPose.value, bubble: string) => {
  petPose.value = pose
  petBubble.value = bubble

  if (poseTimer) {
    clearTimeout(poseTimer)
  }

  poseTimer = setTimeout(() => {
    petPose.value = 'idle'
    petBubble.value = 'Koko is waiting for your next move.'
  }, 1800)
}

const tapPet = () => {
  setPetPose('wave', `${pet.name} is happy to see you.`)
}

const petActions = [
  {
    key: 'wave',
    label: 'Wave',
    bubble: 'Koko leans closer and wiggles a paw.',
    run: () => {},
  },
  {
    key: 'snack',
    label: 'Snack',
    bubble: 'A tiny snack makes the mood meter glow.',
    run: () => carePet('feedMeal'),
  },
  {
    key: 'sleep',
    label: 'Rest',
    bubble: 'Koko curls up for a soft little recharge.',
    run: () => carePet('rest'),
  },
] as const

const triggerPetAction = (action: (typeof petActions)[number]) => {
  action.run()
  setPetPose(action.key, action.bubble)
}

onBeforeUnmount(() => {
  if (poseTimer) {
    clearTimeout(poseTimer)
  }
})
</script>

<template>
  <view class="page-view">
    <view class="page-head">
      <view>
        <view class="eyebrow">宠物主界面</view>
        <view>首页</view>
      </view>
      <view>今天继续和团子一起成长吧。</view>
    </view>

    <view class="page-grid-2 page-home-stack">
      <view class="hero-card panel-block--full home-pet-card">
        <view class="hero-layout hero-layout--centered">
          <view class="pet-image-frame">
            <view class="home-pet-placeholder">
              <view class="pet-stage">
                <view class="pet-bubble">{{ petBubble }}</view>
                <button class="pet-shell-button" @click="tapPet">
                  <view class="pet-shell" :class="`pet-shell--${petPose}`">
                    <view class="pet-shadow" />
                    <view class="pet-tail" />
                    <view class="pet-body">
                      <view class="pet-ear pet-ear--left" />
                      <view class="pet-ear pet-ear--right" />
                      <view class="pet-face">
                        <view class="pet-blush pet-blush--left" />
                        <view class="pet-blush pet-blush--right" />
                        <view class="pet-eye pet-eye--left" />
                        <view class="pet-eye pet-eye--right" />
                        <view class="pet-mouth" />
                      </view>
                      <view class="pet-arm pet-arm--left" />
                      <view class="pet-arm pet-arm--right" />
                      <view class="pet-foot pet-foot--left" />
                      <view class="pet-foot pet-foot--right" />
                    </view>
                  </view>
                </button>
                <view class="pet-action-row">
                  <button
                    v-for="action in petActions"
                    :key="action.key"
                    class="pet-action-pill"
                    @click="triggerPetAction(action)"
                  >
                    {{ action.label }}
                  </button>
                </view>
              </view>
            </view>
          </view>

          <view class="hero-copy hero-copy--centered">
            <view class="eyebrow">我的宠物</view>
            <view>{{ pet.name }} · {{ pet.stage }} · {{ pet.state }}</view>
            <view>圆圆的团子今天软乎乎的，继续陪伴就能慢慢长大。</view>
            <button class="quick-action-button" @click="showGrowthPopup = true">成长阶段</button>
          </view>
        </view>
      </view>

      <view class="panel-block panel-block--full home-attribute-panel">
        <view class="eyebrow">属性概览</view>
        <view>健康、心情、饥饿、精力、亲密度、清洁度</view>
        <view class="stats-grid">
          <StatusCard
            v-for="item in statEntries"
            :key="item.key"
            :label="item.label"
            :value="item.value"
            :hint="item.hint"
            :color="item.color"
          />
        </view>
      </view>

      <view class="panel-block">
        <view class="eyebrow">宠物照料</view>
        <view>日常互动</view>
        <view class="quick-action-grid">
          <button class="quick-action-button" @click="carePet('feedMeal')">喂食</button>
          <button class="quick-action-button" @click="carePet('clean')">清洁</button>
          <button class="quick-action-button" @click="carePet('rest')">打理小窝</button>
          <button class="quick-action-button" @click="carePet('play')">装扮</button>
        </view>
      </view>

      <view class="panel-block">
        <view class="eyebrow">生命档案</view>
        <view>记录陪伴轨迹</view>
        <view class="muted-line">查看领养时间、成长阶段、病史和里程碑记录。</view>
        <view class="action-stack">
          <button class="quick-action-button quick-action-button--ghost" @click="openPage('/pages/archive/index')">
            打开生命档案
          </button>
        </view>
      </view>
    </view>

    <view v-if="showGrowthPopup" class="overlay-mask" @click="showGrowthPopup = false">
      <view class="overlay-card" @click.stop>
        <view class="eyebrow">成长路线</view>
        <view>团子成长五阶段</view>
        <view class="stage-row">
          <view v-for="(item, index) in growthSteps" :key="item" class="stage-item stage-item--active">
            <view>{{ index + 1 }}</view>
            <view>{{ item }}</view>
          </view>
        </view>
        <button class="quick-action-button quick-action-button--ghost" @click="showGrowthPopup = false">关闭</button>
      </view>
    </view>
  </view>
</template>
