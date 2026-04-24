<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useKokoState } from '../composables/useKokoState'
import type { MiniGameResult, MiniGameType } from '../types/koko'

interface FallingBall {
  id: string
  left: number
  top: number
  speed: number
}

interface BubbleItem {
  id: string
  left: number
  bottom: number
  speed: number
  size: number
}

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    defaultGame?: MiniGameType
  }>(),
  {
    defaultGame: 'catch',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  complete: [result: MiniGameResult]
}>()

const { applyMiniGameReward, setActiveMiniGame } = useKokoState()

const activeGame = ref<MiniGameType>(props.defaultGame)
const isRunning = ref(false)
const score = ref(0)
const timeLeft = ref(0)
const summary = ref('点击开始，和可可一起玩一会儿。')
const balls = ref<FallingBall[]>([])
const bubbles = ref<BubbleItem[]>([])

let spawnTimer: ReturnType<typeof setInterval> | undefined
let moveTimer: ReturnType<typeof setInterval> | undefined
let countdownTimer: ReturnType<typeof setInterval> | undefined

const gameCopy = computed(() =>
  activeGame.value === 'catch'
    ? {
        title: '接球小游戏',
        target: '16+',
        startHint: '点击开始，帮可可把落下来的小球接住。',
        runningHint: '快点点住下落的小球，帮可可接住它们。',
      }
    : {
        title: '戳泡泡小游戏',
        target: '18+',
        startHint: '点击开始后，戳破可可吹起来的泡泡。',
        runningHint: '泡泡越靠上消失得越快，出手也要更快。',
      },
)

const clearTimers = () => {
  if (spawnTimer) clearInterval(spawnTimer)
  if (moveTimer) clearInterval(moveTimer)
  if (countdownTimer) clearInterval(countdownTimer)
  spawnTimer = undefined
  moveTimer = undefined
  countdownTimer = undefined
}

const resetBoard = () => {
  clearTimers()
  isRunning.value = false
  score.value = 0
  timeLeft.value = activeGame.value === 'catch' ? 25 : 20
  balls.value = []
  bubbles.value = []
  summary.value = gameCopy.value.startHint
}

const close = () => {
  clearTimers()
  setActiveMiniGame(null)
  emit('update:modelValue', false)
}

const finishGame = () => {
  clearTimers()
  isRunning.value = false

  const result: MiniGameResult =
    activeGame.value === 'catch'
      ? {
          gameType: 'catch',
          score: score.value,
          bonusMood: score.value >= 16 ? 4 : 0,
          bonusIntimacy: score.value >= 12 ? 3 : 0,
        }
      : {
          gameType: 'bubble',
          score: score.value,
          bonusMood: score.value >= 18 ? 5 : 0,
          bonusClean: score.value >= 12 ? 2 : 0,
        }

  applyMiniGameReward(result)
  emit('complete', result)
  summary.value =
    activeGame.value === 'catch'
      ? score.value >= 14
        ? '接得很稳，可可高兴得想转圈。'
        : '这一局结束啦，再来一次会更熟练。'
      : score.value >= 18
        ? '泡泡都被你戳破了，可可开心得直晃尾巴。'
        : '这一轮已经结束，下一局可以再快一点。'
}

const startGame = () => {
  clearTimers()
  isRunning.value = true
  score.value = 0
  timeLeft.value = activeGame.value === 'catch' ? 25 : 20
  balls.value = []
  bubbles.value = []
  summary.value = gameCopy.value.runningHint
  setActiveMiniGame(activeGame.value)

  if (activeGame.value === 'catch') {
    spawnTimer = setInterval(() => {
      balls.value = [
        ...balls.value,
        {
          id: `ball-${Math.random().toString(36).slice(2, 8)}`,
          left: Math.floor(Math.random() * 76) + 4,
          top: 0,
          speed: 4 + Math.random() * 3,
        },
      ].slice(-10)
    }, 650)

    moveTimer = setInterval(() => {
      balls.value = balls.value
        .map((ball) => ({ ...ball, top: ball.top + ball.speed }))
        .filter((ball) => ball.top < 88)
    }, 120)
  } else {
    spawnTimer = setInterval(() => {
      bubbles.value = [
        ...bubbles.value,
        {
          id: `bubble-${Math.random().toString(36).slice(2, 8)}`,
          left: Math.floor(Math.random() * 72) + 8,
          bottom: 18,
          speed: 4 + Math.random() * 2,
          size: 62 + Math.floor(Math.random() * 18),
        },
      ].slice(-12)
    }, 550)

    moveTimer = setInterval(() => {
      bubbles.value = bubbles.value
        .map((item) => ({ ...item, bottom: item.bottom + item.speed }))
        .filter((item) => item.bottom < 92)
    }, 140)
  }

  countdownTimer = setInterval(() => {
    timeLeft.value -= 1
    if (timeLeft.value <= 0) {
      finishGame()
    }
  }, 1000)
}

const hitCatch = (id: string) => {
  if (!isRunning.value || activeGame.value !== 'catch') return
  balls.value = balls.value.filter((ball) => ball.id !== id)
  score.value += 2
}

const hitBubble = (id: string) => {
  if (!isRunning.value || activeGame.value !== 'bubble') return
  bubbles.value = bubbles.value.filter((item) => item.id !== id)
  score.value += 1
}

const switchGame = (game: MiniGameType) => {
  if (activeGame.value === game) return
  activeGame.value = game
  resetBoard()
  setActiveMiniGame(game)
}

watch(
  () => props.modelValue,
  (value) => {
    if (value) {
      activeGame.value = props.defaultGame
      resetBoard()
      setActiveMiniGame(props.defaultGame)
    } else {
      clearTimers()
      setActiveMiniGame(null)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearTimers()
})
</script>

<template>
  <view class="mini-game-drawer" :class="{ 'mini-game-drawer--open': modelValue }">
    <view class="mini-game-drawer__backdrop" @click="close" />
    <view class="mini-game-drawer__panel">
      <view class="mini-game-drawer__handle" />
      <view class="mini-game-drawer__head">
        <view>
          <view class="mini-game-drawer__eyebrow">玩耍时间</view>
          <view class="mini-game-drawer__title">{{ gameCopy.title }}</view>
        </view>
        <button class="mini-game-drawer__close" @click="close">收起</button>
      </view>

      <view class="mini-game-tabs">
        <button
          class="mini-game-tabs__item"
          :class="{ 'mini-game-tabs__item--active': activeGame === 'catch' }"
          @click="switchGame('catch')"
        >
          接球
        </button>
        <button
          class="mini-game-tabs__item"
          :class="{ 'mini-game-tabs__item--active': activeGame === 'bubble' }"
          @click="switchGame('bubble')"
        >
          戳泡泡
        </button>
      </view>

      <view class="mini-game-scorebar">
        <view class="mini-game-scorecard">
          <view class="mini-game-scorecard__label">当前分数</view>
          <view class="mini-game-scorecard__value">{{ score }}</view>
        </view>
        <view class="mini-game-scorecard">
          <view class="mini-game-scorecard__label">倒计时</view>
          <view class="mini-game-scorecard__value">{{ timeLeft }}s</view>
        </view>
        <view class="mini-game-scorecard">
          <view class="mini-game-scorecard__label">本局目标</view>
          <view class="mini-game-scorecard__value">{{ gameCopy.target }}</view>
        </view>
      </view>

      <view v-if="activeGame === 'catch'" class="mini-game-stage mini-game-stage--catch">
        <button
          v-for="ball in balls"
          :key="ball.id"
          class="mini-game-ball"
          :style="{ left: `${ball.left}%`, top: `${ball.top}%` }"
          @click="hitCatch(ball.id)"
        />
        <view class="mini-game-pet mini-game-pet--catch" />
      </view>

      <view v-else class="mini-game-stage mini-game-stage--bubble">
        <button
          v-for="bubble in bubbles"
          :key="bubble.id"
          class="mini-game-bubble"
          :style="{ left: `${bubble.left}%`, bottom: `${bubble.bottom}%`, width: `${bubble.size}rpx`, height: `${bubble.size}rpx` }"
          @click="hitBubble(bubble.id)"
        />
        <view class="mini-game-pet mini-game-pet--bubble" />
      </view>

      <view class="mini-game-summary">{{ summary }}</view>

      <view class="mini-game-actions">
        <button class="mini-game-actions__primary" @click="startGame">
          {{ isRunning ? '重新开始' : '开始游戏' }}
        </button>
        <button class="mini-game-actions__ghost" @click="close">返回首页</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.mini-game-drawer {
  inset: 0;
  opacity: 0;
  pointer-events: none;
  position: fixed;
  transition: opacity 0.28s ease;
  z-index: 40;
}

.mini-game-drawer--open {
  opacity: 1;
  pointer-events: auto;
}

.mini-game-drawer__backdrop {
  background: rgba(25, 42, 56, 0.16);
  inset: 0;
  position: absolute;
}

.mini-game-drawer__panel {
  background:
    linear-gradient(180deg, rgba(247, 255, 255, 0.98), rgba(235, 247, 255, 0.95)),
    #f4fbff;
  border-radius: 32rpx 32rpx 0 0;
  bottom: 0;
  box-shadow: 0 -18rpx 56rpx rgba(65, 114, 140, 0.2);
  left: 0;
  min-height: 760rpx;
  padding: 20rpx 28rpx calc(30rpx + env(safe-area-inset-bottom));
  position: absolute;
  right: 0;
  transform: translateY(100%);
  transition: transform 0.28s ease;
}

.mini-game-drawer--open .mini-game-drawer__panel {
  transform: translateY(0);
}

.mini-game-drawer__handle {
  background: rgba(98, 144, 173, 0.35);
  border-radius: 999rpx;
  height: 10rpx;
  margin: 0 auto 22rpx;
  width: 96rpx;
}

.mini-game-drawer__head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.mini-game-drawer__eyebrow {
  color: #5f8c78;
  font-size: 22rpx;
  letter-spacing: 2rpx;
}

.mini-game-drawer__title {
  color: #20394b;
  font-size: 34rpx;
  font-weight: 700;
}

.mini-game-drawer__close,
.mini-game-tabs__item,
.mini-game-actions__primary,
.mini-game-actions__ghost,
.mini-game-ball,
.mini-game-bubble {
  border: none;
  margin: 0;
  padding: 0;
}

.mini-game-drawer__close::after,
.mini-game-tabs__item::after,
.mini-game-actions__primary::after,
.mini-game-actions__ghost::after,
.mini-game-ball::after,
.mini-game-bubble::after {
  border: none;
}

.mini-game-drawer__close {
  background: rgba(255, 255, 255, 0.76);
  border-radius: 999rpx;
  color: #3e6678;
  font-size: 24rpx;
  padding: 14rpx 22rpx;
}

.mini-game-tabs {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 999rpx;
  display: flex;
  gap: 12rpx;
  margin-bottom: 22rpx;
  padding: 10rpx;
}

.mini-game-tabs__item {
  background: transparent;
  border-radius: 999rpx;
  color: #5f7f8d;
  flex: 1;
  font-size: 25rpx;
  padding: 16rpx 0;
}

.mini-game-tabs__item--active {
  background: linear-gradient(135deg, #8adfb0, #66c6de);
  color: #173949;
  font-weight: 700;
}

.mini-game-scorebar {
  display: grid;
  gap: 16rpx;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: 20rpx;
}

.mini-game-scorecard {
  background: rgba(255, 255, 255, 0.72);
  border: 2rpx solid rgba(148, 205, 211, 0.35);
  border-radius: 24rpx;
  color: #30536b;
  padding: 18rpx;
}

.mini-game-scorecard__label {
  font-size: 22rpx;
  opacity: 0.78;
}

.mini-game-scorecard__value {
  font-size: 34rpx;
  font-weight: 700;
  margin-top: 8rpx;
}

.mini-game-stage {
  background: linear-gradient(180deg, #dff4ff 0%, #dff5da 70%, #bde7ad 100%);
  border-radius: 30rpx;
  height: 420rpx;
  margin-bottom: 18rpx;
  overflow: hidden;
  position: relative;
}

.mini-game-stage--bubble {
  background: linear-gradient(180deg, #dff5ff 0%, #d7f0ff 46%, #cfeec9 100%);
}

.mini-game-stage::before {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.44), transparent 48%);
  content: '';
  inset: 0;
  position: absolute;
}

.mini-game-pet {
  background: linear-gradient(180deg, #fffdf3 0%, #fff1cf 100%);
  border-radius: 46% 46% 42% 42%;
  bottom: 42rpx;
  box-shadow: 0 16rpx 28rpx rgba(136, 121, 66, 0.16);
  height: 128rpx;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: 118rpx;
}

.mini-game-pet::before,
.mini-game-pet::after {
  background: #ffe2a5;
  border-radius: 18rpx 18rpx 6rpx 6rpx;
  content: '';
  height: 34rpx;
  position: absolute;
  top: -10rpx;
  width: 22rpx;
}

.mini-game-pet::before {
  left: 22rpx;
  transform: rotate(-18deg);
}

.mini-game-pet::after {
  right: 22rpx;
  transform: rotate(18deg);
}

.mini-game-ball {
  background: radial-gradient(circle at 30% 30%, #fff 0%, #fff8e9 18%, #ffbd6f 52%, #ff8f4d 100%);
  border-radius: 50%;
  box-shadow: 0 8rpx 16rpx rgba(245, 138, 72, 0.3);
  height: 44rpx;
  position: absolute;
  width: 44rpx;
}

.mini-game-bubble {
  background: radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.98), rgba(177, 241, 255, 0.68) 52%, rgba(89, 195, 228, 0.44) 100%);
  border-radius: 50%;
  box-shadow: inset -6rpx -6rpx 14rpx rgba(72, 166, 196, 0.16), 0 12rpx 22rpx rgba(78, 167, 203, 0.18);
  position: absolute;
}

.mini-game-summary {
  color: #3b6277;
  font-size: 24rpx;
  line-height: 1.6;
  min-height: 76rpx;
}

.mini-game-actions {
  display: grid;
  gap: 14rpx;
  grid-template-columns: 1fr 1fr;
  margin-top: 18rpx;
}

.mini-game-actions__primary,
.mini-game-actions__ghost {
  border-radius: 999rpx;
  font-size: 27rpx;
  padding: 20rpx 0;
}

.mini-game-actions__primary {
  background: linear-gradient(135deg, #f8cf6a, #ff9667);
  color: #51351f;
  font-weight: 700;
}

.mini-game-actions__ghost {
  background: rgba(255, 255, 255, 0.72);
  color: #4a7084;
}
</style>
