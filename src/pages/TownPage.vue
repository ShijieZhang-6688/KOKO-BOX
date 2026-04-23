<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

interface TownPet {
  id: string
  x: number
  y: number
  scale: number
  mood: 'happy' | 'idle' | 'sad'
}

interface MapLocation {
  name: 'home' | 'shop' | 'square' | 'task_house'
  label: string
  x: number
  y: number
}

const MOVE_INTERVAL = 16
const MOVE_DURATION = 520
const componentInstance = getCurrentInstance()

const locations: MapLocation[] = [
  { name: 'home', label: 'Home', x: 80, y: 220 },
  { name: 'shop', label: 'Shop', x: 260, y: 220 },
  { name: 'square', label: 'Square', x: 170, y: 320 },
  { name: 'task_house', label: 'Tasks', x: 170, y: 420 },
]

const trees = [
  { key: 'tree-1', x: 34, y: 72, scale: 1 },
  { key: 'tree-2', x: 116, y: 54, scale: 0.86 },
  { key: 'tree-3', x: 222, y: 60, scale: 0.94 },
  { key: 'tree-4', x: 304, y: 88, scale: 1.08 },
]

const flowers = [
  { key: 'flower-1', x: 62, y: 364, tone: 'pink' },
  { key: 'flower-2', x: 304, y: 356, tone: 'yellow' },
  { key: 'flower-3', x: 90, y: 462, tone: 'sky' },
  { key: 'flower-4', x: 272, y: 470, tone: 'pink' },
  { key: 'flower-5', x: 130, y: 186, tone: 'yellow' },
  { key: 'flower-6', x: 236, y: 188, tone: 'sky' },
] as const

const stones = [
  { key: 'stone-1', x: 38, y: 432, size: 'large' },
  { key: 'stone-2', x: 318, y: 428, size: 'small' },
  { key: 'stone-3', x: 164, y: 884, size: 'small' },
] as const

const grassPatches = [
  { key: 'grass-1', x: 26, y: 318, width: 58, height: 24, rotate: -8 },
  { key: 'grass-2', x: 294, y: 314, width: 64, height: 26, rotate: 12 },
  { key: 'grass-3', x: 120, y: 506, width: 82, height: 28, rotate: 0 },
  { key: 'grass-4', x: 254, y: 514, width: 74, height: 28, rotate: -4 },
]

const pennants = [
  { key: 'flag-1', x: 104, y: 284, tone: 'coral' },
  { key: 'flag-2', x: 132, y: 270, tone: 'sun' },
  { key: 'flag-3', x: 160, y: 258, tone: 'sky' },
  { key: 'flag-4', x: 188, y: 252, tone: 'mint' },
  { key: 'flag-5', x: 216, y: 258, tone: 'coral' },
  { key: 'flag-6', x: 244, y: 270, tone: 'sun' },
  { key: 'flag-7', x: 272, y: 284, tone: 'sky' },
] as const

const pets = ref<TownPet[]>([
  {
    id: 'koko',
    x: 144,
    y: 332,
    scale: 0.62,
    mood: 'happy',
  },
])
const activePetId = ref('koko')
const activePose = ref<'idle' | 'wave' | 'snack' | 'sleep'>('idle')
const bubbleText = ref('Tap Koko to say hi.')
const activeLocation = ref('')
const mapRect = ref<{ left: number; top: number; width: number; height: number } | null>(null)

let moveTimer: ReturnType<typeof setInterval> | undefined
let poseTimer: ReturnType<typeof setTimeout> | undefined
let locationTimer: ReturnType<typeof setTimeout> | undefined

const activePet = computed(() => pets.value.find((pet) => pet.id === activePetId.value) ?? pets.value[0])

const activePetStyle = computed(() => {
  const pet = activePet.value
  return {
    transform: `translate(${pet.x}px, ${pet.y}px) scale(${pet.scale})`,
  }
})

const clamp = (value: number, min: number, max: number) => {
  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

const px = (value: number) => `${value}rpx`
const locationStyle = (x: number, y: number) => `left:${px(x)};top:${px(y)};`
const treeStyle = (x: number, y: number, scale: number) =>
  `left:${px(x)};top:${px(y)};transform:scale(${scale});`
const flowerStyle = (x: number, y: number) => `left:${px(x)};top:${px(y)};`
const stoneStyle = (x: number, y: number) => `left:${px(x)};top:${px(y)};`
const grassStyle = (x: number, y: number, width: number, height: number, rotate: number) =>
  `left:${px(x)};top:${px(y)};width:${px(width)};height:${px(height)};transform:rotate(${rotate}deg);`
const pennantStyle = (x: number, y: number) => `left:${px(x)};top:${px(y)};`

const measureTownMap = () => {
  const query = uni.createSelectorQuery()
  const scope = componentInstance?.proxy

  if (scope) {
    query.in(scope)
  }

  query
    .select('.town-map')
    .boundingClientRect((rect) => {
      if (!rect) {
        return
      }

      mapRect.value = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }
    })
    .exec()
}

const clearMoveTimer = () => {
  if (moveTimer) {
    clearInterval(moveTimer)
    moveTimer = undefined
  }
}

const clearPoseTimer = () => {
  if (poseTimer) {
    clearTimeout(poseTimer)
    poseTimer = undefined
  }
}

const clearLocationTimer = () => {
  if (locationTimer) {
    clearTimeout(locationTimer)
    locationTimer = undefined
  }
}

const setPetPose = (pose: typeof activePose.value, text: string) => {
  activePose.value = pose
  bubbleText.value = text

  clearPoseTimer()
  poseTimer = setTimeout(() => {
    activePose.value = 'idle'
    bubbleText.value = 'Tap Koko to say hi.'
    poseTimer = undefined
  }, 1800)
}

const updatePetPosition = (petId: string, x: number, y: number) => {
  pets.value = pets.value.map((pet) => (pet.id === petId ? { ...pet, x, y } : pet))
}

const movePetTo = (targetX: number, targetY: number) => {
  const pet = activePet.value
  if (!pet) {
    return
  }

  clearMoveTimer()
  const steps = Math.max(14, Math.round(MOVE_DURATION / MOVE_INTERVAL))
  const deltaX = (targetX - pet.x) / steps
  const deltaY = (targetY - pet.y) / steps
  let currentStep = 0

  moveTimer = setInterval(() => {
    currentStep += 1

    if (currentStep >= steps) {
      updatePetPosition(pet.id, targetX, targetY)
      clearMoveTimer()
      return
    }

    updatePetPosition(
      pet.id,
      Math.round(pet.x + deltaX * currentStep),
      Math.round(pet.y + deltaY * currentStep),
    )
  }, MOVE_INTERVAL)
}

const handleMapTap = (event: {
  detail?: { x?: number; y?: number }
  changedTouches?: Array<{ pageX?: number; pageY?: number; clientX?: number; clientY?: number }>
}) => {
  if (!mapRect.value) {
    measureTownMap()
    return
  }

  const detailX = event.detail?.x
  const detailY = event.detail?.y
  const touch = event.changedTouches?.[0]
  const touchX = touch?.pageX ?? touch?.clientX
  const touchY = touch?.pageY ?? touch?.clientY
  const useDetailAsLocal =
    typeof detailX === 'number' &&
    typeof detailY === 'number' &&
    detailX >= 0 &&
    detailY >= 0 &&
    detailX <= mapRect.value.width &&
    detailY <= mapRect.value.height

  const localX = useDetailAsLocal
    ? detailX
    : typeof touchX === 'number'
      ? touchX - mapRect.value.left
      : undefined
  const localY = useDetailAsLocal
    ? detailY
    : typeof touchY === 'number'
      ? touchY - mapRect.value.top
      : undefined

  if (typeof localX !== 'number' || typeof localY !== 'number') {
    return
  }

  const pet = activePet.value
  const footprintWidth = 148 * pet.scale
  const footprintHeight = 182 * pet.scale
  const maxX = Math.max(12, mapRect.value.width - footprintWidth - 12)
  const maxY = Math.max(18, mapRect.value.height - footprintHeight - 18)
  const targetX = Math.round(clamp(localX - footprintWidth / 2, 12, maxX))
  const targetY = Math.round(clamp(localY - footprintHeight * 0.78, 18, maxY))

  movePetTo(targetX, targetY)
}

const handleLocationTap = (name: string) => {
  clearLocationTimer()
  activeLocation.value = name
  console.log(name)
  locationTimer = setTimeout(() => {
    activeLocation.value = ''
    locationTimer = undefined
  }, 1600)
}

const tapPet = () => {
  setPetPose('wave', 'Koko is happy to see you.')
}

onMounted(() => {
  nextTick(() => {
    measureTownMap()
  })
})

onBeforeUnmount(() => {
  clearMoveTimer()
  clearPoseTimer()
  clearLocationTimer()
})
</script>

<template>
  <view class="town-page">
    <view class="town-map" @click="handleMapTap">
      <view class="town-map__sky-glow" />
      <view class="town-map__cloudbank town-map__cloudbank--left" />
      <view class="town-map__cloudbank town-map__cloudbank--right" />
      <view class="town-map__treeline" />
      <view class="town-map__plaza-shadow" />
      <view class="town-map__grass-shadow town-map__grass-shadow--left" />
      <view class="town-map__grass-shadow town-map__grass-shadow--right" />

      <view class="town-map__path town-map__path--left" />
      <view class="town-map__path town-map__path--right" />
      <view class="town-map__path town-map__path--bottom" />
      <view class="town-map__path town-map__path--ring" />
      <view class="town-map__path-dots town-map__path-dots--left" />
      <view class="town-map__path-dots town-map__path-dots--right" />
      <view class="town-map__path-dots town-map__path-dots--bottom" />

      <view
        v-for="flag in pennants"
        :key="flag.key"
        class="pennant"
        :class="`pennant--${flag.tone}`"
        :style="pennantStyle(flag.x, flag.y)"
      >
        <view class="pennant__string" />
        <view class="pennant__flag" />
      </view>

      <view
        v-for="patch in grassPatches"
        :key="patch.key"
        class="grass-patch"
        :style="grassStyle(patch.x, patch.y, patch.width, patch.height, patch.rotate)"
      />

      <view v-for="tree in trees" :key="tree.key" class="tree tree--decor" :style="treeStyle(tree.x, tree.y, tree.scale)">
        <view class="tree__shadow" />
        <view class="tree__trunk" />
        <view class="tree__crown tree__crown--back" />
        <view class="tree__crown tree__crown--front" />
      </view>

      <view
        v-for="location in locations"
        :key="location.name"
        class="location"
        :class="[
          `location--${location.name}`,
          activeLocation === location.name ? 'location--active' : '',
        ]"
        :style="locationStyle(location.x, location.y)"
        @click.stop="handleLocationTap(location.name)"
      >
        <template v-if="location.name === 'home'">
          <view class="building building--home">
            <view class="building__shadow" />
            <view class="building__roof" />
            <view class="building__body" />
            <view class="building__door" />
            <view class="building__window building__window--left" />
            <view class="building__window building__window--right" />
            <view class="building__label">{{ location.label }}</view>
          </view>
        </template>

        <template v-else-if="location.name === 'shop'">
          <view class="building building--shop">
            <view class="building__shadow" />
            <view class="building__roof" />
            <view class="building__awning" />
            <view class="building__body" />
            <view class="building__window building__window--left" />
            <view class="building__window building__window--right" />
            <view class="building__counter" />
            <view class="building__label">{{ location.label }}</view>
          </view>
        </template>

        <template v-else-if="location.name === 'square'">
          <view class="square">
            <view class="square__shadow" />
            <view class="square__platform" />
            <view class="square__tile square__tile--one" />
            <view class="square__tile square__tile--two" />
            <view class="square__tile square__tile--three" />
            <view class="square__ring" />
            <view class="square__fountain-base" />
            <view class="square__fountain-water" />
            <view class="square__fountain-core" />
            <view class="square__ripple square__ripple--one" />
            <view class="square__ripple square__ripple--two" />
            <view class="square__fountain-jet square__fountain-jet--left" />
            <view class="square__fountain-jet square__fountain-jet--center" />
            <view class="square__fountain-jet square__fountain-jet--right" />
            <view class="building__label building__label--square">{{ location.label }}</view>
          </view>
        </template>

        <template v-else>
          <view class="building building--task">
            <view class="building__shadow" />
            <view class="building__roof" />
            <view class="building__body" />
            <view class="building__board" />
            <view class="building__door" />
            <view class="building__window building__window--left" />
            <view class="building__window building__window--right" />
            <view class="building__label">{{ location.label }}</view>
          </view>
        </template>
      </view>

      <view
        v-for="flower in flowers"
        :key="flower.key"
        class="flower"
        :class="`flower--${flower.tone}`"
        :style="flowerStyle(flower.x, flower.y)"
      >
        <view class="flower__center" />
        <view class="flower__petal flower__petal--top" />
        <view class="flower__petal flower__petal--right" />
        <view class="flower__petal flower__petal--bottom" />
        <view class="flower__petal flower__petal--left" />
      </view>

      <view v-for="stone in stones" :key="stone.key" class="stone" :class="`stone--${stone.size}`" :style="stoneStyle(stone.x, stone.y)" />

      <view v-if="activeLocation" class="town-map__toast">{{ activeLocation }}</view>

      <view class="town-pet" :class="`town-pet--${activePet.mood}`" :style="activePetStyle">
        <view class="town-pet__stage">
          <view class="pet-bubble">{{ bubbleText }}</view>
          <button class="pet-shell-button" @click.stop="tapPet">
            <view class="pet-shell" :class="`pet-shell--${activePose}`">
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
        </view>
      </view>

      <view class="town-map__hint">点击草地移动宠物，点击建筑查看位置名称</view>
    </view>
  </view>
</template>

<style scoped>
.town-page {
  min-height: calc(100vh - 20px);
}

.town-map {
  position: relative;
  min-height: calc(100vh - 20px - env(safe-area-inset-bottom));
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(126, 138, 168, 0.14);
  background:
    radial-gradient(circle at 50% 22%, rgba(255, 255, 255, 0.48), transparent 24%),
    radial-gradient(circle at 18% 82%, rgba(149, 215, 144, 0.28), transparent 20%),
    radial-gradient(circle at 82% 80%, rgba(141, 210, 151, 0.24), transparent 18%),
    linear-gradient(180deg, #cbecff 0%, #dff3ff 22%, #9fda8f 22%, #6dbd6e 100%);
  box-shadow: 0 24px 56px rgba(61, 82, 132, 0.1);
}

.town-map__sky-glow {
  position: absolute;
  left: 50%;
  top: 22px;
  width: 260px;
  height: 110px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0));
  transform: translateX(-50%);
}

.town-map__cloudbank {
  position: absolute;
  top: 30px;
  width: 86px;
  height: 30px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow:
    15px -5px 0 6px rgba(255, 255, 255, 0.82),
    37px 0 0 3px rgba(255, 255, 255, 0.78);
  opacity: 0.9;
}

.town-map__cloudbank--left {
  left: 18px;
}

.town-map__cloudbank--right {
  right: 22px;
}

.town-map__treeline {
  position: absolute;
  left: -20px;
  right: -20px;
  top: 54px;
  height: 92px;
  border-radius: 0 0 60px 60px;
  background:
    radial-gradient(circle at 8% 70%, #74c984 0, #74c984 24px, transparent 25px),
    radial-gradient(circle at 18% 44%, #5bb870 0, #5bb870 32px, transparent 33px),
    radial-gradient(circle at 32% 64%, #6ac27b 0, #6ac27b 26px, transparent 27px),
    radial-gradient(circle at 50% 46%, #5ab56e 0, #5ab56e 38px, transparent 39px),
    radial-gradient(circle at 66% 62%, #67c07b 0, #67c07b 28px, transparent 29px),
    radial-gradient(circle at 80% 40%, #57b06c 0, #57b06c 36px, transparent 37px),
    radial-gradient(circle at 92% 70%, #74c984 0, #74c984 24px, transparent 25px);
  opacity: 0.95;
}

.town-map__plaza-shadow {
  position: absolute;
  left: 50%;
  top: 346px;
  width: 180px;
  height: 74px;
  border-radius: 50%;
  background: rgba(76, 123, 84, 0.14);
  transform: translateX(-50%);
  filter: blur(5px);
}

.town-map__grass-shadow {
  position: absolute;
  bottom: 102px;
  width: 110px;
  height: 56px;
  border-radius: 50%;
  background: rgba(77, 140, 82, 0.12);
  filter: blur(4px);
}

.town-map__grass-shadow--left {
  left: 10px;
}

.town-map__grass-shadow--right {
  right: 10px;
}

.town-map__path {
  position: absolute;
  z-index: 1;
  background: linear-gradient(180deg, #f8e8bd 0%, #ecd39d 100%);
  box-shadow:
    inset 0 3px 5px rgba(255, 255, 255, 0.34),
    0 8px 12px rgba(117, 101, 73, 0.12);
}

.town-map__path--left {
  left: 62px;
  top: 214px;
  width: 88px;
  height: 44px;
  border-radius: 999px 40px 40px 999px;
  transform: rotate(24deg);
}

.town-map__path--right {
  right: 58px;
  top: 212px;
  width: 92px;
  height: 44px;
  border-radius: 40px 999px 999px 40px;
  transform: rotate(-24deg);
}

.town-map__path--bottom {
  left: 136px;
  top: 426px;
  width: 56px;
  height: 128px;
  border-radius: 44px 44px 64px 64px;
}

.town-map__path--ring {
  left: 102px;
  top: 356px;
  width: 132px;
  height: 84px;
  border-radius: 999px;
  background: rgba(240, 217, 170, 0.82);
  box-shadow: inset 0 0 0 12px rgba(248, 232, 189, 0.96);
}

.town-map__path-dots {
  position: absolute;
  z-index: 2;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.52) 0, rgba(255, 255, 255, 0.52) 5px, transparent 6px);
  background-size: 18px 18px;
  opacity: 0.45;
}

.town-map__path-dots--left {
  left: 78px;
  top: 220px;
  width: 70px;
  height: 34px;
  transform: rotate(24deg);
}

.town-map__path-dots--right {
  right: 72px;
  top: 219px;
  width: 72px;
  height: 34px;
  transform: rotate(-24deg);
}

.town-map__path-dots--bottom {
  left: 147px;
  top: 440px;
  width: 36px;
  height: 100px;
}

.pennant {
  position: absolute;
  z-index: 4;
  width: 14px;
  height: 28px;
  animation: pennantSway 2s ease-in-out infinite;
}

.pennant__string {
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 251, 239, 0.9);
  transform: translateX(-50%);
}

.pennant__flag {
  position: absolute;
  left: 50%;
  top: 11px;
  width: 12px;
  height: 13px;
  border-radius: 3px 7px 7px 3px;
  transform: translateX(-50%);
  box-shadow: 0 4px 8px rgba(84, 102, 149, 0.1);
}

.pennant--coral .pennant__flag {
  background: linear-gradient(180deg, #ff9a82 0%, #ff7c65 100%);
}

.pennant--sun .pennant__flag {
  background: linear-gradient(180deg, #ffd782 0%, #f3bc53 100%);
}

.pennant--sky .pennant__flag {
  background: linear-gradient(180deg, #8fd8ff 0%, #67bdf5 100%);
}

.pennant--mint .pennant__flag {
  background: linear-gradient(180deg, #9ee6b2 0%, #67c987 100%);
}

.location {
  position: absolute;
  z-index: 5;
  transition: transform 180ms ease;
}

.location--square {
  z-index: 4;
}

.location--active {
  transform: translateY(-5px);
}

.location--active .building__label,
.location--active .building__label--square {
  background: linear-gradient(180deg, #ffffff 0%, #fff6da 100%);
  color: #3f5375;
  box-shadow: 0 10px 20px rgba(84, 102, 149, 0.16);
}

.location--active .building__shadow,
.location--active .square__shadow {
  background: rgba(61, 82, 102, 0.22);
}

.building,
.square {
  position: relative;
}

.building__shadow,
.square__shadow {
  position: absolute;
  left: 50%;
  bottom: -4px;
  border-radius: 999px;
  background: rgba(61, 82, 102, 0.16);
  transform: translateX(-50%);
  filter: blur(3px);
}

.building__shadow {
  width: 78px;
  height: 18px;
}

.square__shadow {
  width: 112px;
  height: 20px;
}

.building__roof,
.building__body,
.building__door,
.building__window,
.building__awning,
.building__counter,
.building__board,
.square__platform,
.square__ring,
.square__fountain-base,
.square__fountain-water,
.square__fountain-core,
.square__fountain-jet,
.square__tile,
.square__ripple {
  position: absolute;
}

.building__label {
  position: absolute;
  left: 50%;
  bottom: -30px;
  min-width: 58px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #4d607e;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 5px 10px rgba(84, 102, 149, 0.1);
}

.building__label--square {
  bottom: -24px;
}

.building--home,
.building--shop,
.building--task {
  width: 94px;
  height: 90px;
}

.building--home .building__roof,
.building--task .building__roof {
  left: 10px;
  top: 0;
  width: 74px;
  height: 40px;
  border-radius: 16px 16px 12px 12px;
  transform: skewX(-8deg);
}

.building--shop .building__roof {
  left: 8px;
  top: 1px;
  width: 78px;
  height: 32px;
  border-radius: 14px;
}

.building--home .building__body,
.building--task .building__body,
.building--shop .building__body {
  left: 12px;
  top: 24px;
  width: 70px;
  height: 56px;
  border-radius: 14px;
  box-shadow:
    inset 0 4px 6px rgba(255, 255, 255, 0.28),
    0 8px 14px rgba(74, 88, 127, 0.14);
}

.building--home .building__roof {
  background: linear-gradient(180deg, #ffaf91 0%, #ee8666 100%);
}

.building--home .building__body {
  background: linear-gradient(180deg, #fff5ea 0%, #f8e6ce 100%);
}

.building--home .building__door {
  left: 39px;
  top: 48px;
  width: 16px;
  height: 32px;
  border-radius: 8px 8px 6px 6px;
  background: linear-gradient(180deg, #c88d69 0%, #ae7354 100%);
}

.building--home .building__window {
  top: 42px;
}

.building--home .building__window--left {
  left: 22px;
}

.building--home .building__window--right {
  right: 22px;
}

.building--shop .building__roof {
  background: linear-gradient(180deg, #8ec8ff 0%, #64a9f6 100%);
}

.building--shop .building__body {
  background: linear-gradient(180deg, #ffffff 0%, #eef5ff 100%);
}

.building--shop .building__awning {
  left: 14px;
  top: 28px;
  width: 68px;
  height: 16px;
  border-radius: 8px;
  background:
    linear-gradient(
      90deg,
      #ff8b9a 0,
      #ff8b9a 18%,
      #fff7f7 18%,
      #fff7f7 36%,
      #ff8b9a 36%,
      #ff8b9a 54%,
      #fff7f7 54%,
      #fff7f7 72%,
      #ff8b9a 72%,
      #ff8b9a 100%
    );
  box-shadow: 0 4px 7px rgba(100, 169, 246, 0.18);
}

.building--shop .building__counter {
  left: 20px;
  top: 60px;
  width: 50px;
  height: 12px;
  border-radius: 999px;
  background: #89cfa5;
}

.building--shop .building__window {
  top: 46px;
}

.building--shop .building__window--left {
  left: 20px;
}

.building--shop .building__window--right {
  right: 20px;
}

.building--task .building__roof {
  background: linear-gradient(180deg, #9b8cff 0%, #7363e9 100%);
}

.building--task .building__body {
  background: linear-gradient(180deg, #f6f2ff 0%, #e8e0ff 100%);
}

.building--task .building__board {
  left: 50%;
  top: 28px;
  width: 44px;
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(180deg, #ffd58a 0%, #efb95e 100%);
  transform: translateX(-50%);
  box-shadow: 0 4px 8px rgba(115, 99, 233, 0.18);
}

.building--task .building__door {
  left: 38px;
  top: 48px;
  width: 18px;
  height: 32px;
  border-radius: 8px 8px 6px 6px;
  background: linear-gradient(180deg, #a488ed 0%, #7f68d4 100%);
}

.building--task .building__window {
  top: 46px;
}

.building--task .building__window--left {
  left: 20px;
}

.building--task .building__window--right {
  right: 20px;
}

.building__window {
  width: 12px;
  height: 16px;
  border-radius: 6px;
  background: linear-gradient(180deg, #ffffff 0%, #b9e5ff 100%);
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.4);
}

.square {
  width: 106px;
  height: 92px;
}

.square__platform {
  left: 6px;
  top: 16px;
  width: 94px;
  height: 58px;
  border-radius: 22px;
  background: linear-gradient(180deg, #f6f8fb 0%, #e6ebf2 100%);
  box-shadow: 0 8px 14px rgba(84, 102, 149, 0.12);
}

.square__tile {
  top: 28px;
  width: 10px;
  height: 10px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.45);
}

.square__tile--one {
  left: 22px;
}

.square__tile--two {
  left: 47px;
}

.square__tile--three {
  right: 22px;
}

.square__ring {
  left: 18px;
  top: 22px;
  width: 70px;
  height: 42px;
  border-radius: 999px;
  background: linear-gradient(180deg, #d7e1ec 0%, #c5d1df 100%);
}

.square__fountain-base {
  left: 36px;
  top: 30px;
  width: 34px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, #dce7f5 0%, #c5d3e6 100%);
}

.square__fountain-water {
  left: 41px;
  top: 28px;
  width: 24px;
  height: 15px;
  border-radius: 999px;
  background: linear-gradient(180deg, #9fe4ff 0%, #61c6f8 100%);
  box-shadow: inset 0 3px 5px rgba(255, 255, 255, 0.4);
  animation: fountainPulse 2.4s ease-in-out infinite;
}

.square__fountain-core {
  left: 48px;
  top: 20px;
  width: 10px;
  height: 20px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f4fbff 0%, #dceeff 100%);
}

.square__ripple {
  left: 50%;
  top: 25px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.48);
  transform: translateX(-50%);
  animation: fountainPulse 2.4s ease-in-out infinite;
}

.square__ripple--one {
  width: 31px;
  height: 12px;
}

.square__ripple--two {
  width: 42px;
  height: 18px;
  top: 23px;
  opacity: 0.72;
}

.square__fountain-jet {
  top: 10px;
  width: 5px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(126, 214, 255, 0.78) 100%);
}

.square__fountain-jet--left {
  left: 43px;
  height: 18px;
  transform: rotate(-12deg);
  animation: fountainJet 1.8s ease-in-out infinite;
}

.square__fountain-jet--center {
  left: 50px;
  height: 24px;
  animation: fountainPulse 2.4s ease-in-out infinite;
}

.square__fountain-jet--right {
  left: 57px;
  height: 18px;
  transform: rotate(12deg);
  animation: fountainJet 1.8s ease-in-out infinite;
}

.tree {
  position: absolute;
  width: 48px;
  height: 68px;
  z-index: 3;
}

.tree--decor {
  animation: treeBob 3.6s ease-in-out infinite;
}

.tree__shadow {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 36px;
  height: 10px;
  border-radius: 999px;
  background: rgba(61, 82, 102, 0.14);
  transform: translateX(-50%);
  filter: blur(2px);
}

.tree__trunk {
  position: absolute;
  left: 50%;
  bottom: 5px;
  width: 11px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, #a77457 0%, #80523d 100%);
  transform: translateX(-50%);
}

.tree__crown {
  position: absolute;
  left: 50%;
  border-radius: 50%;
  transform: translateX(-50%);
}

.tree__crown--back {
  top: 8px;
  width: 36px;
  height: 36px;
  background: linear-gradient(180deg, #88d585 0%, #5bb570 100%);
}

.tree__crown--front {
  top: 0;
  width: 46px;
  height: 40px;
  background: linear-gradient(180deg, #a4e394 0%, #6fc66f 100%);
}

.grass-patch {
  position: absolute;
  z-index: 2;
  border-radius: 999px;
  background:
    radial-gradient(circle at 28% 50%, rgba(255, 255, 255, 0.22), transparent 24%),
    linear-gradient(180deg, #84d67f 0%, #59b660 100%);
  box-shadow: 0 5px 8px rgba(76, 137, 84, 0.12);
}

.flower {
  position: absolute;
  width: 14px;
  height: 14px;
  z-index: 6;
  animation: flowerBob 3s ease-in-out infinite;
}

.flower__center {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ffd96b;
  transform: translate(-50%, -50%);
}

.flower__petal {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.flower--pink .flower__petal {
  background: #ff9db7;
}

.flower--yellow .flower__petal {
  background: #ffe58b;
}

.flower--sky .flower__petal {
  background: #8fd6ff;
}

.flower__petal--top {
  left: 4px;
  top: 0;
}

.flower__petal--right {
  right: 0;
  top: 4px;
}

.flower__petal--bottom {
  left: 4px;
  bottom: 0;
}

.flower__petal--left {
  left: 0;
  top: 4px;
}

.stone {
  position: absolute;
  z-index: 4;
  border-radius: 999px;
  background: linear-gradient(180deg, #f5f7fa 0%, #d8dfe9 100%);
  box-shadow: 0 5px 8px rgba(84, 102, 149, 0.1);
}

.stone--large {
  width: 28px;
  height: 14px;
}

.stone--small {
  width: 20px;
  height: 12px;
}

.town-map__toast {
  position: absolute;
  left: 50%;
  top: 14px;
  z-index: 10;
  min-width: 92px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(37, 48, 71, 0.82);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
  transform: translateX(-50%);
  box-shadow: 0 8px 14px rgba(34, 47, 74, 0.2);
}

.town-pet {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 7;
  transform-origin: center bottom;
}

.town-pet__stage {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 8px;
}

.town-pet .pet-bubble {
  max-width: 128px;
  padding: 8px 10px;
  font-size: 11px;
  border-radius: 12px;
}

.town-pet .pet-shell {
  width: 126px;
  height: 110px;
}

.town-pet .pet-shadow {
  width: 68px;
  height: 11px;
}

.town-pet .pet-body {
  width: 76px;
  height: 70px;
  bottom: 14px;
  border-radius: 32px 32px 28px 28px;
}

.town-pet .pet-face {
  inset: 12px 10px 12px;
}

.town-pet .pet-ear {
  width: 20px;
  height: 28px;
  top: -10px;
}

.town-pet .pet-eye {
  top: 18px;
  width: 7px;
  height: 9px;
}

.town-pet .pet-eye--left {
  left: 14px;
}

.town-pet .pet-eye--right {
  right: 14px;
}

.town-pet .pet-blush {
  top: 27px;
  width: 11px;
  height: 6px;
}

.town-pet .pet-mouth {
  top: 34px;
  width: 12px;
  height: 7px;
}

.town-pet .pet-tail {
  width: 28px;
  height: 12px;
  right: 18px;
  bottom: 38px;
}

.town-pet .pet-arm {
  top: 36px;
  width: 13px;
  height: 21px;
}

.town-pet .pet-foot {
  width: 15px;
  height: 10px;
}

.town-map__hint {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 8;
  max-width: 160px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #5b6b88;
  font-size: 11px;
  line-height: 1.35;
  box-shadow: 0 8px 14px rgba(84, 102, 149, 0.1);
}

@media (max-width: 640px) {
  .town-page {
    min-height: calc(100vh - 16px);
  }

  .town-map {
    min-height: calc(100vh - 16px - env(safe-area-inset-bottom));
    border-radius: 22px;
  }
}

@keyframes fountainPulse {
  0%,
  100% {
    transform: translateX(-50%) scale(1);
    opacity: 0.9;
  }
  50% {
    transform: translateX(-50%) scale(1.08);
    opacity: 1;
  }
}

@keyframes fountainJet {
  0%,
  100% {
    opacity: 0.8;
    height: 18px;
  }
  50% {
    opacity: 1;
    height: 22px;
  }
}

@keyframes treeBob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

@keyframes pennantSway {
  0%,
  100% {
    transform: rotate(0deg);
  }
  50% {
    transform: rotate(7deg);
  }
}

@keyframes flowerBob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}
</style>
