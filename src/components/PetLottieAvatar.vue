<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import lottie from 'lottie-miniprogram'
import happyDogAnimation from '../assets/animations/happy-dog.json'

const props = withDefaults(
  defineProps<{
    sizeRpx?: number
    paused?: boolean
    still?: boolean
    mirror?: boolean
  }>(),
  {
    sizeRpx: 600,
    paused: false,
    still: false,
    mirror: false,
  },
)

const componentInstance = getCurrentInstance()
const canvasId = `pet-lottie-${Math.random().toString(36).slice(2, 10)}`
const avatarSizeStyle = computed(() => ({
  width: `${props.sizeRpx}rpx`,
  height: `${props.sizeRpx}rpx`,
}))
const wrapperStyle = computed(() => ({
  width: `${props.sizeRpx}rpx`,
  height: `${props.sizeRpx}rpx`,
  transform: `scaleX(${props.mirror ? -1 : 1})`,
}))

let lottieAnimation: {
  destroy?: () => void
  goToAndStop?: (value: number, isFrame?: boolean) => void
  stop?: () => void
} | null = null

const clearLottieAnimation = () => {
  if (!lottieAnimation) return
  lottieAnimation.destroy?.()
  lottieAnimation = null
}

const initPetLottie = () => {
  if (props.paused) return

  const query = uni.createSelectorQuery()
  const scope = componentInstance?.proxy
  if (scope) query.in(scope)

  query
    .select(`#${canvasId}`)
    .fields({ node: true, size: true }, (result: any) => {
      const canvas = result?.node
      if (!canvas) return

      const context = canvas.getContext('2d')
      if (!context) return

      const windowInfo = typeof uni.getWindowInfo === 'function' ? uni.getWindowInfo() : undefined
      const dpr = windowInfo?.pixelRatio ?? 1
      const width = Number(result?.width ?? 0)
      const height = Number(result?.height ?? 0)
      const fallbackSizePx = uni.upx2px(props.sizeRpx)
      const finalWidth = width > 0 ? width : fallbackSizePx
      const finalHeight = height > 0 ? height : fallbackSizePx

      canvas.width = finalWidth * dpr
      canvas.height = finalHeight * dpr
      if (canvas.style) {
        canvas.style.width = `${finalWidth}px`
        canvas.style.height = `${finalHeight}px`
      }
      context.scale(dpr, dpr)

      clearLottieAnimation()
      lottie.setup(canvas)
      lottieAnimation = lottie.loadAnimation({
        loop: true,
        autoplay: !props.still,
        animationData: happyDogAnimation,
        rendererSettings: {
          context,
          preserveAspectRatio: 'xMidYMid meet',
        },
      })
      if (props.still) {
        lottieAnimation?.goToAndStop?.(12, true)
        lottieAnimation?.stop?.()
      }
    })
    .exec()
}

watch(
  () => [props.paused, props.sizeRpx, props.still],
  async ([paused]) => {
    clearLottieAnimation()
    if (paused) return
    await nextTick()
    initPetLottie()
  },
)

onMounted(() => {
  nextTick(() => {
    initPetLottie()
  })
})

onBeforeUnmount(() => {
  clearLottieAnimation()
})
</script>

<template>
  <view class="pet-lottie-avatar" :style="wrapperStyle">
    <canvas :id="canvasId" :canvas-id="canvasId" type="2d" class="pet-lottie-avatar__canvas" :style="avatarSizeStyle" />
  </view>
</template>

<style scoped>
.pet-lottie-avatar {
  align-items: center;
  display: flex;
  justify-content: center;
  position: relative;
}

.pet-lottie-avatar__canvas {
  display: block;
  height: 100%;
  width: 100%;
}
</style>
