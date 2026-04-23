const DEFAULT_BUBBLE = 'Tap Koko to say hi.'

const clampScale = (value) => {
  const numeric = Number(value)

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1
  }

  return numeric
}

Component({
  properties: {
    x: {
      type: Number,
      value: 0,
    },
    y: {
      type: Number,
      value: 0,
    },
    scale: {
      type: Number,
      value: 1,
    },
    mood: {
      type: String,
      value: 'idle',
    },
    variant: {
      type: String,
      value: 'default',
    },
  },

  data: {
    pose: 'idle',
    bubbleText: DEFAULT_BUBBLE,
    containerStyle: 'transform: translate(0px, 0px) scale(1);',
    petActions: [
      {
        key: 'wave',
        label: 'Wave',
        bubble: 'Koko leans closer and wiggles a paw.',
      },
      {
        key: 'snack',
        label: 'Snack',
        bubble: 'A tiny snack makes the mood meter glow.',
      },
      {
        key: 'sleep',
        label: 'Rest',
        bubble: 'Koko curls up for a soft little recharge.',
      },
    ],
  },

  lifetimes: {
    attached() {
      this.syncContainerStyle()
    },
    detached() {
      this.clearPoseTimer()
    },
  },

  observers: {
    'x, y, scale'() {
      this.syncContainerStyle()
    },
  },

  methods: {
    noop() {},

    syncContainerStyle() {
      const x = Number(this.properties.x) || 0
      const y = Number(this.properties.y) || 0
      const scale = clampScale(this.properties.scale)

      this.setData({
        containerStyle: `transform: translate(${x}px, ${y}px) scale(${scale});`,
      })
    },

    clearPoseTimer() {
      if (this.poseTimer) {
        clearTimeout(this.poseTimer)
        this.poseTimer = null
      }
    },

    setPetPose(pose, bubbleText) {
      this.clearPoseTimer()

      this.setData({
        pose,
        bubbleText,
      })

      this.poseTimer = setTimeout(() => {
        this.setData({
          pose: 'idle',
          bubbleText: DEFAULT_BUBBLE,
        })

        this.poseTimer = null
      }, 1800)
    },

    handlePetTap() {
      this.setPetPose('wave', 'Koko is happy to see you.')
      this.triggerEvent('pettap')
    },

    handleActionTap(event) {
      const { action } = event.currentTarget.dataset
      const selectedAction = this.data.petActions.find((item) => item.key === action)

      if (!selectedAction) {
        return
      }

      this.setPetPose(selectedAction.key, selectedAction.bubble)
      this.triggerEvent('actiontap', { action })
    },
  },
})
