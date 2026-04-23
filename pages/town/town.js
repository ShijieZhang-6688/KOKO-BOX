const MOVE_INTERVAL = 16
const MOVE_DURATION = 520

const LOCATIONS = [
  { name: 'home', label: 'Home', x: 80, y: 220 },
  { name: 'shop', label: 'Shop', x: 260, y: 220 },
  { name: 'square', label: 'Square', x: 170, y: 320 },
  { name: 'task_house', label: 'Tasks', x: 170, y: 420 },
]

const TREE_DECORS = [
  { key: 'tree-1', x: 34, y: 72, scale: 1 },
  { key: 'tree-2', x: 116, y: 54, scale: 0.86 },
  { key: 'tree-3', x: 222, y: 60, scale: 0.94 },
  { key: 'tree-4', x: 304, y: 88, scale: 1.08 },
]

const FLOWER_DECORS = [
  { key: 'flower-1', x: 62, y: 364, tone: 'pink' },
  { key: 'flower-2', x: 304, y: 356, tone: 'yellow' },
  { key: 'flower-3', x: 90, y: 462, tone: 'sky' },
  { key: 'flower-4', x: 272, y: 470, tone: 'pink' },
  { key: 'flower-5', x: 130, y: 186, tone: 'yellow' },
  { key: 'flower-6', x: 236, y: 188, tone: 'sky' },
]

const STONE_DECORS = [
  { key: 'stone-1', x: 38, y: 432, size: 'large' },
  { key: 'stone-2', x: 318, y: 428, size: 'small' },
  { key: 'stone-3', x: 164, y: 884, size: 'small' },
]

const GRASS_DECORS = [
  { key: 'grass-1', x: 26, y: 318, width: 58, height: 24, rotate: -8 },
  { key: 'grass-2', x: 294, y: 314, width: 64, height: 26, rotate: 12 },
  { key: 'grass-3', x: 120, y: 506, width: 82, height: 28, rotate: 0 },
  { key: 'grass-4', x: 254, y: 514, width: 74, height: 28, rotate: -4 },
]

const PENNANTS = [
  { key: 'flag-1', x: 104, y: 284, tone: 'coral' },
  { key: 'flag-2', x: 132, y: 270, tone: 'sun' },
  { key: 'flag-3', x: 160, y: 258, tone: 'sky' },
  { key: 'flag-4', x: 188, y: 252, tone: 'mint' },
  { key: 'flag-5', x: 216, y: 258, tone: 'coral' },
  { key: 'flag-6', x: 244, y: 270, tone: 'sun' },
  { key: 'flag-7', x: 272, y: 284, tone: 'sky' },
]

const clamp = (value, min, max) => {
  if (value < min) {
    return min
  }

  if (value > max) {
    return max
  }

  return value
}

const createLocationStyle = (location) => `left:${location.x}rpx;top:${location.y}rpx;`
const createTreeStyle = (tree) => `left:${tree.x}rpx;top:${tree.y}rpx;transform:scale(${tree.scale});`
const createFlowerStyle = (flower) => `left:${flower.x}rpx;top:${flower.y}rpx;`
const createStoneStyle = (stone) => `left:${stone.x}rpx;top:${stone.y}rpx;`
const createGrassStyle = (grass) =>
  `left:${grass.x}rpx;top:${grass.y}rpx;width:${grass.width}rpx;height:${grass.height}rpx;transform:rotate(${grass.rotate}deg);`
const createPennantStyle = (pennant) => `left:${pennant.x}rpx;top:${pennant.y}rpx;`

Page({
  data: {
    pets: [
      {
        id: 'koko',
        x: 144,
        y: 332,
        scale: 0.62,
        mood: 'happy',
      },
    ],
    activePetId: 'koko',
    activeLocation: '',
    mapWidth: 0,
    mapHeight: 0,
    petFootprint: {
      width: 148,
      height: 182,
    },
    locations: LOCATIONS.map((location) =>
      Object.assign({}, location, {
        style: createLocationStyle(location),
      })
    ),
    trees: TREE_DECORS.map((tree) =>
      Object.assign({}, tree, {
        style: createTreeStyle(tree),
      })
    ),
    flowers: FLOWER_DECORS.map((flower) =>
      Object.assign({}, flower, {
        style: createFlowerStyle(flower),
      })
    ),
    stones: STONE_DECORS.map((stone) =>
      Object.assign({}, stone, {
        style: createStoneStyle(stone),
      })
    ),
    grassPatches: GRASS_DECORS.map((grass) =>
      Object.assign({}, grass, {
        style: createGrassStyle(grass),
      })
    ),
    pennants: PENNANTS.map((pennant) =>
      Object.assign({}, pennant, {
        style: createPennantStyle(pennant),
      })
    ),
  },

  onReady() {
    this.measureTownMap()
  },

  onShow() {
    this.measureTownMap()
  },

  onUnload() {
    this.clearMoveTimer()
    this.clearLocationTimer()
  },

  measureTownMap() {
    const query = this.createSelectorQuery()

    query
      .select('#town-map')
      .boundingClientRect((rect) => {
        if (!rect) {
          return
        }

        this.mapRect = rect
        this.setData({
          mapWidth: rect.width,
          mapHeight: rect.height,
        })
      })
      .exec()
  },

  clearMoveTimer() {
    if (this.moveTimer) {
      clearInterval(this.moveTimer)
      this.moveTimer = null
    }
  },

  clearLocationTimer() {
    if (this.locationTimer) {
      clearTimeout(this.locationTimer)
      this.locationTimer = null
    }
  },

  getActivePet() {
    return this.data.pets.find((pet) => pet.id === this.data.activePetId) || this.data.pets[0]
  },

  setPetPosition(petId, x, y) {
    const pets = this.data.pets.map((pet) => {
      if (pet.id !== petId) {
        return pet
      }

      return Object.assign({}, pet, {
        x,
        y,
      })
    })

    this.setData({ pets })
  },

  getClampedTarget(localX, localY) {
    const activePet = this.getActivePet()
    const footprintWidth = this.data.petFootprint.width * activePet.scale
    const footprintHeight = this.data.petFootprint.height * activePet.scale
    const maxX = Math.max(12, this.data.mapWidth - footprintWidth - 12)
    const maxY = Math.max(18, this.data.mapHeight - footprintHeight - 18)
    const targetX = clamp(localX - footprintWidth / 2, 12, maxX)
    const targetY = clamp(localY - footprintHeight * 0.78, 18, maxY)

    return {
      x: Math.round(targetX),
      y: Math.round(targetY),
    }
  },

  movePetTo(petId, targetX, targetY) {
    const activePet = this.data.pets.find((pet) => pet.id === petId)

    if (!activePet) {
      return
    }

    this.clearMoveTimer()

    const steps = Math.max(14, Math.round(MOVE_DURATION / MOVE_INTERVAL))
    const deltaX = (targetX - activePet.x) / steps
    const deltaY = (targetY - activePet.y) / steps
    let currentStep = 0

    this.moveTimer = setInterval(() => {
      currentStep += 1

      if (currentStep >= steps) {
        this.setPetPosition(petId, targetX, targetY)
        this.clearMoveTimer()
        return
      }

      this.setPetPosition(
        petId,
        Math.round(activePet.x + deltaX * currentStep),
        Math.round(activePet.y + deltaY * currentStep)
      )
    }, MOVE_INTERVAL)
  },

  handleMapTap(event) {
    if (!this.mapRect) {
      this.measureTownMap()
      return
    }

    const touch = event.changedTouches && event.changedTouches[0]
    if (!touch) {
      return
    }

    const localX = touch.pageX - this.mapRect.left
    const localY = touch.pageY - this.mapRect.top
    const target = this.getClampedTarget(localX, localY)

    this.movePetTo(this.data.activePetId, target.x, target.y)
  },

  handleLocationTap(event) {
    const { name } = event.currentTarget.dataset
    this.clearLocationTimer()
    this.setData({
      activeLocation: name,
    })
    this.locationTimer = setTimeout(() => {
      this.setData({
        activeLocation: '',
      })
      this.locationTimer = null
    }, 1600)
    console.log(name)
  },
})
