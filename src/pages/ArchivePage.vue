<script setup lang="ts">
import { computed } from 'vue'
import { useKokoState } from '../composables/useKokoState'
import { useLanguage } from '../composables/useLanguage'

const {
  archive,
  metrics,
  pet,
  economy,
  settings,
  weeklyCompletionRate,
} = useKokoState()
const { t } = useLanguage()

const isZh = computed(() => settings.value.language === 'zh')
const copy = computed(() => ({
  eyebrow: isZh.value ? 'ACHIEVEMENTS' : 'ACHIEVEMENTS',
  title: isZh.value ? '成就系统' : 'Achievements',
  subtitle: isZh.value ? '把陪伴、任务和小游戏沉淀成可持续的成长记录。' : 'A growth record built from care, tasks, and mini games.',
  unlocked: isZh.value ? '已解锁' : 'Unlocked',
  inProgress: isZh.value ? '进行中' : 'In progress',
  locked: isZh.value ? '未解锁' : 'Locked',
  nextGoal: isZh.value ? '下一目标' : 'Next Goal',
  allBadges: isZh.value ? '成就徽章' : 'Achievement Badges',
  timeline: isZh.value ? '成长时间线' : 'Growth Timeline',
  health: isZh.value ? '照料记录' : 'Care Records',
  reward: isZh.value ? '奖励' : 'Reward',
  progress: isZh.value ? '进度' : 'Progress',
  noTimeline: isZh.value ? '继续陪伴 Koko，新的里程碑会记录在这里。' : 'Keep caring for Koko; new milestones will appear here.',
  minutes: isZh.value ? '分钟' : 'min',
}))

const achievementSeeds = computed(() => [
  {
    id: 'first-chat',
    title: isZh.value ? '第一声回应' : 'First Reply',
    description: isZh.value ? '完成至少 1 次互动，让 Koko 记住你的节奏。' : 'Complete at least 1 interaction so Koko learns your rhythm.',
    current: metrics.value.interactions,
    target: 1,
    reward: '+2 mood',
    tone: 'mint',
  },
  {
    id: 'steady-companion',
    title: isZh.value ? '稳定陪伴者' : 'Steady Companion',
    description: isZh.value ? '累计陪伴 60 分钟，形成轻松的日常循环。' : 'Reach 60 companion minutes and build a gentle daily loop.',
    current: metrics.value.companionMinutes,
    target: 60,
    reward: '+5 bond',
    tone: 'sky',
  },
  {
    id: 'task-closer',
    title: isZh.value ? '任务闭环' : 'Task Closer',
    description: isZh.value ? '完成 10 项待办，让计划和陪伴互相推动。' : 'Complete 10 plans and let tasks support companionship.',
    current: metrics.value.completedTasks,
    target: 10,
    reward: '+10 coins',
    tone: 'sun',
  },
  {
    id: 'warm-bond',
    title: isZh.value ? '亲密升温' : 'Warming Bond',
    description: isZh.value ? '亲密度达到 70，Koko 会更积极回应互动。' : 'Reach 70 bond for warmer Koko responses.',
    current: pet.value.intimacy,
    target: 70,
    reward: '+1 title',
    tone: 'rose',
  },
  {
    id: 'coin-saver',
    title: isZh.value ? '金豆小管家' : 'Coin Keeper',
    description: isZh.value ? '累计持有 50 金豆，解锁更完整的消费记录感。' : 'Hold 50 coins and make the economy loop visible.',
    current: economy.value.coins,
    target: 50,
    reward: '+1 badge',
    tone: 'gold',
  },
  {
    id: 'weekly-flow',
    title: isZh.value ? '本周节奏' : 'Weekly Flow',
    description: isZh.value ? '本周完成率达到 80%，让陪伴曲线更稳定。' : 'Reach 80% weekly completion for a steadier rhythm.',
    current: weeklyCompletionRate.value,
    target: 80,
    reward: '+4 mood',
    tone: 'leaf',
  },
])

const achievements = computed(() =>
  achievementSeeds.value.map((item) => {
    const progress = Math.min(100, Math.round((Math.max(0, item.current) / item.target) * 100))
    return {
      ...item,
      progress,
      unlocked: progress >= 100,
      status: progress >= 100 ? copy.value.unlocked : progress > 0 ? copy.value.inProgress : copy.value.locked,
    }
  }),
)

const unlockedCount = computed(() => achievements.value.filter((item) => item.unlocked).length)
const nextAchievement = computed(() =>
  achievements.value
    .filter((item) => !item.unlocked)
    .slice()
    .sort((left, right) => right.progress - left.progress)[0] ?? achievements.value[0],
)

const timelineItems = computed(() => [
  ...archive.value.stageHistory.map((item) => ({
    id: `${item.stage}-${item.timestamp}`,
    title: t.value.profile.stages[item.stage] ?? item.stage,
    body: isZh.value ? '宠物成长阶段更新' : 'Pet growth stage updated',
    time: item.timestamp,
  })),
  ...archive.value.milestones.map((item) => ({
    id: item.id,
    title: item.title,
    body: item.description,
    time: item.timestamp,
  })),
])

const careRecords = computed(() => archive.value.medicalLogs)
</script>

<template>
  <view class="achievement-page">
    <view class="achievement-hero">
      <view>
        <view class="achievement-hero__eyebrow">{{ copy.eyebrow }}</view>
        <view class="achievement-hero__title">{{ copy.title }}</view>
        <view class="achievement-hero__subtitle">{{ copy.subtitle }}</view>
      </view>
      <view class="achievement-hero__medal">
        <view>{{ unlockedCount }}/{{ achievements.length }}</view>
        <text>{{ copy.unlocked }}</text>
      </view>
    </view>

    <view v-if="nextAchievement" class="achievement-next">
      <view class="achievement-section-title">{{ copy.nextGoal }}</view>
      <view class="achievement-next__card">
        <view class="achievement-badge" :class="`achievement-badge--${nextAchievement.tone}`">{{ nextAchievement.progress }}%</view>
        <view class="achievement-next__main">
          <view class="achievement-next__title">{{ nextAchievement.title }}</view>
          <view class="achievement-next__body">{{ nextAchievement.description }}</view>
          <view class="achievement-progress">
            <view class="achievement-progress__fill" :style="{ width: `${nextAchievement.progress}%` }" />
          </view>
          <view class="achievement-next__meta">
            {{ copy.progress }} {{ nextAchievement.current }}/{{ nextAchievement.target }} · {{ copy.reward }} {{ nextAchievement.reward }}
          </view>
        </view>
      </view>
    </view>

    <view class="achievement-section">
      <view class="achievement-section-title">{{ copy.allBadges }}</view>
      <view class="achievement-grid">
        <view
          v-for="item in achievements"
          :key="item.id"
          class="achievement-card"
          :class="[{ 'achievement-card--locked': !item.unlocked }, `achievement-card--${item.tone}`]"
        >
          <view class="achievement-card__top">
            <view class="achievement-badge" :class="`achievement-badge--${item.tone}`">{{ item.unlocked ? '✓' : `${item.progress}%` }}</view>
            <view class="achievement-card__status">{{ item.status }}</view>
          </view>
          <view class="achievement-card__title">{{ item.title }}</view>
          <view class="achievement-card__body">{{ item.description }}</view>
          <view class="achievement-progress">
            <view class="achievement-progress__fill" :style="{ width: `${item.progress}%` }" />
          </view>
          <view class="achievement-card__reward">{{ copy.reward }} {{ item.reward }}</view>
        </view>
      </view>
    </view>

    <view class="achievement-section">
      <view class="achievement-section-title">{{ copy.timeline }}</view>
      <view v-if="timelineItems.length" class="achievement-timeline">
        <view v-for="item in timelineItems" :key="item.id" class="achievement-timeline__item">
          <view class="achievement-timeline__dot" />
          <view>
            <view class="achievement-timeline__title">{{ item.title }}</view>
            <view class="achievement-timeline__body">{{ item.body }}</view>
            <view class="achievement-timeline__time">{{ item.time }}</view>
          </view>
        </view>
      </view>
      <view v-else class="achievement-empty">{{ copy.noTimeline }}</view>
    </view>

    <view class="achievement-section">
      <view class="achievement-section-title">{{ copy.health }}</view>
      <view class="achievement-care-list">
        <view v-for="item in careRecords" :key="item.id" class="achievement-care-card">
          <view>{{ item.note }}</view>
          <text>{{ item.timestamp }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.achievement-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 24rpx;
}

.achievement-hero,
.achievement-next,
.achievement-section,
.achievement-next__card,
.achievement-card,
.achievement-timeline__item,
.achievement-care-card,
.achievement-empty {
  background: #fffdf8;
  border: 2rpx solid rgba(176, 143, 102, 0.16);
  border-radius: 24rpx;
  box-shadow: 0 12rpx 26rpx rgba(167, 124, 72, 0.08);
}

.achievement-hero {
  align-items: flex-end;
  background:
    radial-gradient(circle at 86% 16%, rgba(255, 224, 138, 0.58), transparent 34%),
    linear-gradient(145deg, #fffdf8, #eefbf2);
  display: flex;
  gap: 22rpx;
  justify-content: space-between;
  padding: 26rpx;
}

.achievement-hero__eyebrow {
  color: #5f8c78;
  font-size: 22rpx;
  font-weight: 900;
}

.achievement-hero__title {
  color: #253047;
  font-size: 44rpx;
  font-weight: 900;
  margin-top: 6rpx;
}

.achievement-hero__subtitle {
  color: #7d8a74;
  font-size: 25rpx;
  line-height: 1.5;
  margin-top: 10rpx;
}

.achievement-hero__medal {
  align-items: center;
  background: rgba(255, 255, 255, 0.76);
  border-radius: 24rpx;
  color: #365f56;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  justify-content: center;
  min-height: 128rpx;
  min-width: 146rpx;
  padding: 16rpx 20rpx;
}

.achievement-hero__medal view {
  font-size: 38rpx;
  font-weight: 900;
}

.achievement-hero__medal text {
  color: #8a7a68;
  font-size: 22rpx;
  font-weight: 800;
  margin-top: 4rpx;
}

.achievement-next,
.achievement-section {
  margin-top: 18rpx;
  padding: 20rpx;
}

.achievement-section-title {
  color: #253047;
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 16rpx;
}

.achievement-next__card {
  align-items: flex-start;
  box-shadow: none;
  display: grid;
  gap: 18rpx;
  grid-template-columns: 104rpx minmax(0, 1fr);
  padding: 18rpx;
}

.achievement-badge {
  align-items: center;
  border-radius: 22rpx;
  color: #253047;
  display: flex;
  font-size: 26rpx;
  font-weight: 900;
  height: 90rpx;
  justify-content: center;
  width: 90rpx;
}

.achievement-badge--mint { background: #e8f7ef; color: #365f56; }
.achievement-badge--sky { background: #e3f5ff; color: #2f6f92; }
.achievement-badge--sun { background: #fff0ca; color: #805d2c; }
.achievement-badge--rose { background: #ffe4df; color: #b85454; }
.achievement-badge--gold { background: #ffe7a6; color: #735420; }
.achievement-badge--leaf { background: #eef7d6; color: #56712e; }

.achievement-next__title,
.achievement-card__title,
.achievement-timeline__title,
.achievement-care-card view {
  color: #253047;
  font-size: 28rpx;
  font-weight: 900;
}

.achievement-next__body,
.achievement-card__body,
.achievement-next__meta,
.achievement-card__reward,
.achievement-timeline__body,
.achievement-timeline__time,
.achievement-care-card text,
.achievement-empty {
  color: #8a7a68;
  font-size: 23rpx;
  line-height: 1.45;
}

.achievement-next__body,
.achievement-card__body {
  margin-top: 6rpx;
}

.achievement-progress {
  background: rgba(180, 215, 203, 0.35);
  border-radius: 999rpx;
  height: 14rpx;
  margin-top: 14rpx;
  overflow: hidden;
}

.achievement-progress__fill {
  background: linear-gradient(90deg, #8adfb0, #6bd4c7);
  border-radius: inherit;
  height: 100%;
}

.achievement-next__meta,
.achievement-card__reward {
  font-weight: 800;
  margin-top: 10rpx;
}

.achievement-grid {
  display: grid;
  gap: 14rpx;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.achievement-card {
  box-shadow: none;
  min-height: 288rpx;
  padding: 18rpx;
}

.achievement-card--locked {
  opacity: 0.78;
}

.achievement-card__top {
  align-items: center;
  display: flex;
  gap: 12rpx;
  justify-content: space-between;
}

.achievement-card__status {
  background: rgba(255, 255, 255, 0.76);
  border-radius: 999rpx;
  color: #365f56;
  font-size: 21rpx;
  font-weight: 900;
  padding: 7rpx 12rpx;
}

.achievement-timeline,
.achievement-care-list {
  display: grid;
  gap: 12rpx;
}

.achievement-timeline__item {
  box-shadow: none;
  display: grid;
  gap: 14rpx;
  grid-template-columns: 20rpx minmax(0, 1fr);
  padding: 18rpx;
}

.achievement-timeline__dot {
  background: #8adfb0;
  border-radius: 50%;
  box-shadow: 0 0 0 10rpx rgba(138, 223, 176, 0.18);
  height: 16rpx;
  margin-top: 8rpx;
  width: 16rpx;
}

.achievement-timeline__body,
.achievement-timeline__time,
.achievement-care-card text {
  margin-top: 6rpx;
}

.achievement-care-card,
.achievement-empty {
  box-shadow: none;
  padding: 18rpx;
}
</style>
