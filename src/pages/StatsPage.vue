<script setup lang="ts">
import { computed } from 'vue'
import { useKokoState } from '../composables/useKokoState'
import { useLanguage } from '../composables/useLanguage'

const { t } = useLanguage()
const {
  pet,
  tasks,
  completedTasks,
  economy,
  overviewStats,
  snapshots,
  metrics,
  settings,
  weeklyCompletionRate,
} = useKokoState()

const isZh = computed(() => settings.value.language === 'zh')
const copy = computed(() => ({
  eyebrow: isZh.value ? 'DATA CENTER' : 'DATA CENTER',
  title: isZh.value ? '数据统计' : 'Data Statistics',
  subtitle: isZh.value ? '把陪伴、任务、小游戏和金豆变化整理成可读的成长面板。' : 'A readable dashboard for care, tasks, mini games, and coin activity.',
  overview: isZh.value ? '核心概览' : 'Overview',
  petStatus: isZh.value ? '宠物状态' : 'Pet Status',
  trend: isZh.value ? '最近趋势' : 'Recent Trend',
  insight: isZh.value ? '今日建议' : 'Today Suggestions',
  coinBalance: isZh.value ? '金豆余额' : 'Coin balance',
  activePlans: isZh.value ? '待办池' : 'Active plans',
  completed: isZh.value ? '已完成' : 'Completed',
  interactions: isZh.value ? '互动次数' : 'Interactions',
  minutes: isZh.value ? '陪伴分钟' : 'Companion minutes',
  completion: isZh.value ? '完成率' : 'Completion',
  emptyTrend: isZh.value ? '完成任务或互动后，这里会继续生成新的趋势记录。' : 'New trend records appear after tasks or interactions.',
  remainingPlans: isZh.value ? '项待推进' : 'plans pending',
}))

const activePlanCount = computed(() => tasks.value.filter((item) => item.status !== 'completed').length)
const completedCount = computed(() => completedTasks.value.length)

const kpiCards = computed(() => [
  {
    key: 'interactions',
    label: copy.value.interactions,
    value: metrics.value.interactions,
    hint: isZh.value ? '聊天、照料和小游戏都会计入' : 'Chat, care, and mini games count here',
    tone: 'mint',
  },
  {
    key: 'minutes',
    label: copy.value.minutes,
    value: metrics.value.companionMinutes,
    hint: isZh.value ? '累计陪伴时长' : 'Total companion time',
    tone: 'sky',
  },
  {
    key: 'completed',
    label: copy.value.completed,
    value: completedCount.value,
    hint: isZh.value ? `${activePlanCount.value} ${copy.value.remainingPlans}` : `${activePlanCount.value} ${copy.value.remainingPlans}`,
    tone: 'sun',
  },
  {
    key: 'coins',
    label: copy.value.coinBalance,
    value: economy.value.coins,
    hint: isZh.value ? '任务、游戏、聊天奖励汇总' : 'Rewards from tasks, games, and chat',
    tone: 'gold',
  },
])

const petStatusCards = computed(() => [
  {
    key: 'mood',
    label: t.value.home.stats.mood,
    value: pet.value.mood,
    hint: pet.value.mood >= 70
      ? (isZh.value ? '情绪稳定，适合轻松互动' : 'Stable mood for gentle interaction')
      : (isZh.value ? '建议先聊天或完成一个小任务' : 'Try chat or a small completed plan'),
    tone: 'sun',
  },
  {
    key: 'energy',
    label: t.value.home.stats.energy,
    value: pet.value.energy,
    hint: pet.value.energy >= 60
      ? (isZh.value ? '可以进行短小游戏' : 'Ready for a short mini game')
      : (isZh.value ? '更适合安静陪伴和补水' : 'Quiet company and water fit better'),
    tone: 'leaf',
  },
  {
    key: 'bond',
    label: t.value.home.stats.bond,
    value: pet.value.intimacy,
    hint: pet.value.intimacy >= 70
      ? (isZh.value ? '关系很亲近，保持每日互动' : 'Close bond. Keep daily contact')
      : (isZh.value ? '小游戏和连续待办会继续升温' : 'Mini games and plans keep it growing'),
    tone: 'sky',
  },
])

const trendCards = computed(() =>
  snapshots.value.slice(-7).map((item) => ({
    ...item,
    moodHeight: Math.max(8, item.mood),
    bondHeight: Math.max(8, item.intimacy),
    completionHeight: Math.max(8, item.completionRate),
  })),
)

const insights = computed(() => [
  {
    key: 'completion',
    title: overviewStats.value[0]?.label ?? copy.value.completion,
    value: `${weeklyCompletionRate.value}%`,
    body: weeklyCompletionRate.value >= 70
      ? (isZh.value ? '任务闭环已经比较稳定，可以继续保持当前节奏。' : 'Your planning loop is stable. Keep this pace.')
      : (isZh.value ? '今天先完成一个最小待办，就能让趋势更好看。' : 'Complete one smallest plan today to improve the trend.'),
  },
  {
    key: 'care',
    title: isZh.value ? '陪伴节奏' : 'Companion rhythm',
    value: `${metrics.value.companionMinutes}`,
    body: metrics.value.companionMinutes >= 60
      ? (isZh.value ? '陪伴时间充足，Koko 的状态更容易稳定。' : 'Companion time is strong, helping Koko stay steady.')
      : (isZh.value ? '可以用 3 分钟聊天或小游戏补一段陪伴。' : 'A 3-minute chat or mini game can add a gentle boost.'),
  },
  {
    key: 'coins',
    title: copy.value.coinBalance,
    value: `${economy.value.coins}`,
    body: economy.value.coins > 0
      ? (isZh.value ? '金豆记录页会继续追踪每一次收入和消费来源。' : 'The coin log tracks every gain and spend source.')
      : (isZh.value ? '完成任务或小游戏后，金豆明细会开始出现记录。' : 'Task and game rewards will create coin records.'),
  },
])
</script>

<template>
  <view class="stats-pro-page">
    <view class="stats-pro-hero">
      <view>
        <view class="stats-pro-hero__eyebrow">{{ copy.eyebrow }}</view>
        <view class="stats-pro-hero__title">{{ copy.title }}</view>
        <view class="stats-pro-hero__subtitle">{{ copy.subtitle }}</view>
      </view>
      <view class="stats-pro-hero__rate">
        <view>{{ weeklyCompletionRate }}%</view>
        <text>{{ copy.completion }}</text>
      </view>
    </view>

    <view class="stats-pro-section">
      <view class="stats-pro-section__title">{{ copy.overview }}</view>
      <view class="stats-pro-kpis">
        <view v-for="card in kpiCards" :key="card.key" class="stats-pro-kpi" :class="`stats-pro-kpi--${card.tone}`">
          <view class="stats-pro-kpi__label">{{ card.label }}</view>
          <view class="stats-pro-kpi__value">{{ card.value }}</view>
          <view class="stats-pro-kpi__hint">{{ card.hint }}</view>
        </view>
      </view>
    </view>

    <view class="stats-pro-section">
      <view class="stats-pro-section__title">{{ copy.petStatus }}</view>
      <view class="stats-pro-status-list">
        <view v-for="item in petStatusCards" :key="item.key" class="stats-pro-status">
          <view class="stats-pro-status__head">
            <view>{{ item.label }}</view>
            <view>{{ item.value }}/100</view>
          </view>
          <view class="stats-pro-status__track">
            <view class="stats-pro-status__fill" :class="`stats-pro-status__fill--${item.tone}`" :style="{ width: `${item.value}%` }" />
          </view>
          <view class="stats-pro-status__hint">{{ item.hint }}</view>
        </view>
      </view>
    </view>

    <view class="stats-pro-section">
      <view class="stats-pro-section__title">{{ copy.trend }}</view>
      <view v-if="trendCards.length" class="stats-pro-trend">
        <view v-for="item in trendCards" :key="item.id" class="stats-pro-trend-card">
          <view class="stats-pro-trend-card__bars">
            <view class="stats-pro-trend-card__bar stats-pro-trend-card__bar--mood" :style="{ height: `${item.moodHeight}%` }" />
            <view class="stats-pro-trend-card__bar stats-pro-trend-card__bar--bond" :style="{ height: `${item.bondHeight}%` }" />
            <view class="stats-pro-trend-card__bar stats-pro-trend-card__bar--completion" :style="{ height: `${item.completionHeight}%` }" />
          </view>
          <view class="stats-pro-trend-card__label">{{ item.label }}</view>
          <view class="stats-pro-trend-card__meta">{{ t.statsPage.interactions }} {{ item.interactions }}</view>
        </view>
      </view>
      <view v-else class="stats-pro-empty">{{ copy.emptyTrend }}</view>
    </view>

    <view class="stats-pro-section">
      <view class="stats-pro-section__title">{{ copy.insight }}</view>
      <view class="stats-pro-insights">
        <view v-for="item in insights" :key="item.key" class="stats-pro-insight">
          <view class="stats-pro-insight__value">{{ item.value }}</view>
          <view>
            <view class="stats-pro-insight__title">{{ item.title }}</view>
            <view class="stats-pro-insight__body">{{ item.body }}</view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.stats-pro-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 24rpx;
}

.stats-pro-hero,
.stats-pro-section,
.stats-pro-kpi,
.stats-pro-status,
.stats-pro-trend-card,
.stats-pro-insight,
.stats-pro-empty {
  background: #fffdf8;
  border: 2rpx solid rgba(176, 143, 102, 0.16);
  border-radius: 24rpx;
  box-shadow: 0 12rpx 26rpx rgba(167, 124, 72, 0.08);
}

.stats-pro-hero {
  align-items: flex-end;
  background:
    radial-gradient(circle at 86% 12%, rgba(255, 224, 138, 0.55), transparent 32%),
    linear-gradient(145deg, #fffdf8, #eefbf2);
  display: flex;
  gap: 22rpx;
  justify-content: space-between;
  padding: 26rpx;
}

.stats-pro-hero__eyebrow {
  color: #5f8c78;
  font-size: 22rpx;
  font-weight: 900;
}

.stats-pro-hero__title {
  color: #253047;
  font-size: 44rpx;
  font-weight: 900;
  margin-top: 6rpx;
}

.stats-pro-hero__subtitle {
  color: #7d8a74;
  font-size: 25rpx;
  line-height: 1.5;
  margin-top: 10rpx;
}

.stats-pro-hero__rate {
  align-items: center;
  background: rgba(255, 255, 255, 0.76);
  border-radius: 24rpx;
  color: #365f56;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  justify-content: center;
  min-height: 128rpx;
  padding: 16rpx 20rpx;
  min-width: 138rpx;
}

.stats-pro-hero__rate view {
  font-size: 42rpx;
  font-weight: 900;
}

.stats-pro-hero__rate text {
  color: #8a7a68;
  font-size: 22rpx;
  font-weight: 800;
  margin-top: 4rpx;
}

.stats-pro-section {
  margin-top: 18rpx;
  padding: 20rpx;
}

.stats-pro-section__title {
  color: #253047;
  font-size: 32rpx;
  font-weight: 900;
  margin-bottom: 16rpx;
}

.stats-pro-kpis {
  display: grid;
  gap: 14rpx;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.stats-pro-kpi {
  box-shadow: none;
  min-height: 170rpx;
  padding: 18rpx;
}

.stats-pro-kpi--mint { background: linear-gradient(145deg, #f7fff9, #e8f7ef); }
.stats-pro-kpi--sky { background: linear-gradient(145deg, #f8fdff, #e3f5ff); }
.stats-pro-kpi--sun { background: linear-gradient(145deg, #fffdf8, #fff0ca); }
.stats-pro-kpi--gold { background: linear-gradient(145deg, #fff9e5, #ffe7a6); }

.stats-pro-kpi__label,
.stats-pro-status__hint,
.stats-pro-trend-card__meta,
.stats-pro-insight__body,
.stats-pro-empty {
  color: #8a7a68;
}

.stats-pro-kpi__label {
  font-size: 23rpx;
  font-weight: 800;
}

.stats-pro-kpi__value {
  color: #253047;
  font-size: 42rpx;
  font-weight: 900;
  margin-top: 8rpx;
}

.stats-pro-kpi__hint {
  color: #7d8a74;
  font-size: 22rpx;
  line-height: 1.4;
  margin-top: 8rpx;
}

.stats-pro-status-list,
.stats-pro-insights {
  display: grid;
  gap: 12rpx;
}

.stats-pro-status {
  box-shadow: none;
  padding: 18rpx;
}

.stats-pro-status__head {
  align-items: center;
  color: #253047;
  display: flex;
  font-size: 27rpx;
  font-weight: 900;
  justify-content: space-between;
}

.stats-pro-status__track {
  background: rgba(180, 215, 203, 0.35);
  border-radius: 999rpx;
  height: 16rpx;
  margin-top: 14rpx;
  overflow: hidden;
}

.stats-pro-status__fill {
  border-radius: inherit;
  height: 100%;
}

.stats-pro-status__fill--sun { background: linear-gradient(90deg, #f8cb64, #f0b94a); }
.stats-pro-status__fill--leaf { background: linear-gradient(90deg, #8bd682, #5cc483); }
.stats-pro-status__fill--sky { background: linear-gradient(90deg, #7fd4ed, #61b8f0); }

.stats-pro-status__hint {
  font-size: 23rpx;
  line-height: 1.45;
  margin-top: 10rpx;
}

.stats-pro-trend {
  display: grid;
  gap: 10rpx;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  overflow-x: auto;
}

.stats-pro-trend-card {
  box-shadow: none;
  min-width: 120rpx;
  padding: 12rpx;
}

.stats-pro-trend-card__bars {
  align-items: end;
  background: rgba(245, 250, 238, 0.9);
  border-radius: 16rpx;
  display: grid;
  gap: 6rpx;
  grid-template-columns: repeat(3, 1fr);
  height: 136rpx;
  padding: 10rpx;
}

.stats-pro-trend-card__bar {
  border-radius: 999rpx 999rpx 4rpx 4rpx;
  min-height: 10rpx;
}

.stats-pro-trend-card__bar--mood { background: #f0b94a; }
.stats-pro-trend-card__bar--bond { background: #61b8f0; }
.stats-pro-trend-card__bar--completion { background: #5cc483; }

.stats-pro-trend-card__label {
  color: #253047;
  font-size: 22rpx;
  font-weight: 900;
  margin-top: 10rpx;
}

.stats-pro-trend-card__meta {
  font-size: 20rpx;
  margin-top: 4rpx;
}

.stats-pro-insight {
  align-items: flex-start;
  box-shadow: none;
  display: grid;
  gap: 16rpx;
  grid-template-columns: 112rpx minmax(0, 1fr);
  padding: 18rpx;
}

.stats-pro-insight__value {
  align-items: center;
  background: #e8f7ef;
  border-radius: 20rpx;
  color: #365f56;
  display: flex;
  font-size: 30rpx;
  font-weight: 900;
  justify-content: center;
  min-height: 88rpx;
}

.stats-pro-insight__title {
  color: #253047;
  font-size: 28rpx;
  font-weight: 900;
}

.stats-pro-insight__body,
.stats-pro-empty {
  font-size: 24rpx;
  line-height: 1.5;
}

.stats-pro-empty {
  box-shadow: none;
  padding: 22rpx;
}
</style>
