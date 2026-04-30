<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useKokoState } from '../composables/useKokoState'

type CoinLogRange = 'today' | 'date' | 'month' | 'halfYear' | 'year' | 'all'

const { economy, settings, hydrateState, ensureCoinLogIntegrity, syncEconomyFromCloud } = useKokoState()

const nowMs = ref(Date.now())

const pad2 = (value: number) => String(value).padStart(2, '0')
const formatDateKey = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map((item) => Number(item))
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}
const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
const shiftMonths = (date: Date, months: number) => {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

const selectedRange = ref<CoinLogRange>('today')
const selectedDate = ref(formatDateKey(new Date()))

const isZh = computed(() => settings.value.language === 'zh')
const copy = computed(() => ({
  title: isZh.value ? '金豆明细' : 'Coin Details',
  subtitle: isZh.value ? '每一次获得、消费和补记都会留下来源与时间' : 'Every gain, spend, and reconciliation keeps its source and timestamp.',
  balance: isZh.value ? '当前金豆' : 'Balance',
  empty: isZh.value ? '当前筛选范围内还没有金豆记录。' : 'No coin records in this range.',
  gain: isZh.value ? '获得' : 'Gain',
  consume: isZh.value ? '消费' : 'Spend',
  net: isZh.value ? '净变化' : 'Net',
  count: isZh.value ? '条记录' : 'records',
  pickDate: isZh.value ? '选日期' : 'Pick date',
  rangeTitle: isZh.value ? '查看范围' : 'Range',
  filters: {
    today: isZh.value ? '今天' : 'Today',
    month: isZh.value ? '近一月' : '1 month',
    halfYear: isZh.value ? '近半年' : '6 months',
    year: isZh.value ? '近一年' : '1 year',
    all: isZh.value ? '全部' : 'All',
  },
}))

const rangeOptions = computed<Array<{ key: Exclude<CoinLogRange, 'date'>; label: string }>>(() => [
  { key: 'today', label: copy.value.filters.today },
  { key: 'month', label: copy.value.filters.month },
  { key: 'halfYear', label: copy.value.filters.halfYear },
  { key: 'year', label: copy.value.filters.year },
  { key: 'all', label: copy.value.filters.all },
])

const allCoinLogs = computed(() =>
  [...(economy.value.coinLogs ?? [])].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  ),
)

const rangeBounds = computed(() => {
  const now = new Date(nowMs.value)

  if (selectedRange.value === 'all') {
    return { start: null, end: null }
  }

  if (selectedRange.value === 'date') {
    const start = parseDateKey(selectedDate.value)
    start.setHours(0, 0, 0, 0)
    return { start, end: addDays(start, 1) }
  }

  if (selectedRange.value === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { start, end: addDays(start, 1) }
  }

  return {
    start: shiftMonths(now, selectedRange.value === 'month' ? -1 : selectedRange.value === 'halfYear' ? -6 : -12),
    end: now,
  }
})

const coinLogs = computed(() =>
  allCoinLogs.value.filter((item) => {
    const timestamp = new Date(item.created_at).getTime()
    if (!timestamp) return false
    const { start, end } = rangeBounds.value
    if (start && timestamp < start.getTime()) return false
    if (end && timestamp >= end.getTime()) return false
    return true
  }),
)

const summary = computed(() => {
  const gain = coinLogs.value.filter((item) => item.amount > 0).reduce((total, item) => total + item.amount, 0)
  const consume = coinLogs.value.filter((item) => item.amount < 0).reduce((total, item) => total + Math.abs(item.amount), 0)
  return {
    gain,
    consume,
    net: gain - consume,
    count: coinLogs.value.length,
  }
})

const selectedDateLabel = computed(() => {
  const date = parseDateKey(selectedDate.value)
  return isZh.value
    ? `${date.getFullYear()}年${pad2(date.getMonth() + 1)}月${pad2(date.getDate())}日`
    : date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
})

const activeRangeLabel = computed(() => {
  if (selectedRange.value === 'date') return selectedDateLabel.value
  if (selectedRange.value === 'today') return copy.value.filters.today
  if (selectedRange.value === 'month') return copy.value.filters.month
  if (selectedRange.value === 'halfYear') return copy.value.filters.halfYear
  if (selectedRange.value === 'year') return copy.value.filters.year
  return copy.value.filters.all
})

const setRange = (range: Exclude<CoinLogRange, 'date'>) => {
  selectedRange.value = range
}

const onDateChange = (event: { detail?: { value?: string } }) => {
  const value = event.detail?.value
  if (!value) return
  selectedDate.value = value
  selectedRange.value = 'date'
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(isZh.value ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

onShow(() => {
  nowMs.value = Date.now()
  hydrateState()
  ensureCoinLogIntegrity({ persist: true })
  void syncEconomyFromCloud().then(() => {
    ensureCoinLogIntegrity({ persist: true })
  })
})
</script>

<template>
  <view class="coin-log-page">
    <view class="coin-log-hero">
      <view>
        <view class="coin-log-hero__eyebrow">{{ copy.balance }}</view>
        <view class="coin-log-hero__amount">{{ economy.coins }}</view>
      </view>
      <view>
        <view class="coin-log-hero__title">{{ copy.title }}</view>
        <view class="coin-log-hero__subtitle">{{ copy.subtitle }}</view>
      </view>
    </view>

    <view class="coin-log-filter-panel">
      <view class="coin-log-filter-panel__title">{{ copy.rangeTitle }}</view>
      <view class="coin-log-filters">
        <button
          v-for="item in rangeOptions"
          :key="item.key"
          class="coin-log-filter"
          :class="{ 'coin-log-filter--active': selectedRange === item.key }"
          @click="setRange(item.key)"
        >
          {{ item.label }}
        </button>
        <picker mode="date" :value="selectedDate" @change="onDateChange">
          <view class="coin-log-filter coin-log-filter--date" :class="{ 'coin-log-filter--active': selectedRange === 'date' }">
            {{ copy.pickDate }}
          </view>
        </picker>
      </view>
      <view class="coin-log-active-range">{{ activeRangeLabel }}</view>
    </view>

    <view class="coin-log-summary">
      <view class="coin-log-summary__card coin-log-summary__card--gain">
        <view>{{ copy.gain }}</view>
        <text>+{{ summary.gain }}</text>
      </view>
      <view class="coin-log-summary__card coin-log-summary__card--consume">
        <view>{{ copy.consume }}</view>
        <text>-{{ summary.consume }}</text>
      </view>
      <view class="coin-log-summary__card">
        <view>{{ copy.net }}</view>
        <text>{{ summary.net > 0 ? '+' : '' }}{{ summary.net }}</text>
      </view>
    </view>

    <view class="coin-log-section-head">
      <text>{{ activeRangeLabel }}</text>
      <text>{{ summary.count }} {{ copy.count }}</text>
    </view>

    <view v-if="coinLogs.length" class="coin-log-list">
      <view
        v-for="item in coinLogs"
        :key="item.id"
        class="coin-log-item"
        :class="`coin-log-item--${item.type}`"
      >
        <view class="coin-log-item__main">
          <view class="coin-log-item__reason">{{ item.reason }}</view>
          <view class="coin-log-item__time">{{ formatTime(item.created_at) }}</view>
        </view>
        <view class="coin-log-item__amount">
          {{ item.amount > 0 ? '+' : '' }}{{ item.amount }}
        </view>
      </view>
    </view>

    <view v-else class="coin-log-empty">{{ copy.empty }}</view>
  </view>
</template>

<style scoped>
.coin-log-page {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 28rpx;
}

.coin-log-hero {
  align-items: center;
  background: linear-gradient(145deg, #fff8df, #eefbf2);
  border: 2rpx solid rgba(176, 143, 102, 0.16);
  border-radius: 30rpx;
  box-shadow: 0 16rpx 34rpx rgba(167, 124, 72, 0.1);
  display: flex;
  gap: 28rpx;
  padding: 28rpx;
}

.coin-log-hero__eyebrow,
.coin-log-hero__subtitle,
.coin-log-item__time,
.coin-log-empty,
.coin-log-active-range {
  color: #8a7a68;
}

.coin-log-hero__eyebrow {
  font-size: 22rpx;
  font-weight: 800;
}

.coin-log-hero__amount {
  color: #735420;
  font-size: 56rpx;
  font-weight: 900;
}

.coin-log-hero__title {
  color: #253047;
  font-size: 36rpx;
  font-weight: 900;
}

.coin-log-hero__subtitle {
  font-size: 24rpx;
  line-height: 1.45;
  margin-top: 6rpx;
}

.coin-log-filter-panel,
.coin-log-summary__card,
.coin-log-item,
.coin-log-empty {
  background: #fffdf8;
  border: 2rpx solid rgba(176, 143, 102, 0.14);
  box-shadow: 0 12rpx 26rpx rgba(167, 124, 72, 0.08);
}

.coin-log-filter-panel {
  border-radius: 26rpx;
  margin-top: 22rpx;
  padding: 22rpx;
}

.coin-log-filter-panel__title,
.coin-log-section-head {
  color: #253047;
  font-size: 26rpx;
  font-weight: 900;
}

.coin-log-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}

.coin-log-filter {
  background: rgba(245, 250, 238, 0.9);
  border: 2rpx solid rgba(95, 199, 168, 0.16);
  border-radius: 999rpx;
  color: #365f56;
  font-size: 24rpx;
  font-weight: 800;
  line-height: 1;
  margin: 0;
  padding: 16rpx 20rpx;
}

.coin-log-filter::after {
  border: 0;
}

.coin-log-filter--active {
  background: linear-gradient(135deg, #84dfbd, #65d0c4);
  border-color: rgba(79, 180, 160, 0.28);
  color: #183f3a;
}

.coin-log-filter--date {
  display: block;
}

.coin-log-active-range {
  font-size: 24rpx;
  font-weight: 800;
  margin-top: 16rpx;
}

.coin-log-summary {
  display: grid;
  gap: 14rpx;
  grid-template-columns: repeat(3, 1fr);
  margin-top: 18rpx;
}

.coin-log-summary__card {
  border-radius: 22rpx;
  color: #7d8a74;
  font-size: 22rpx;
  font-weight: 800;
  padding: 18rpx;
}

.coin-log-summary__card text {
  color: #253047;
  display: block;
  font-size: 32rpx;
  font-weight: 900;
  margin-top: 8rpx;
}

.coin-log-summary__card--gain text {
  color: #2f9b64;
}

.coin-log-summary__card--consume text {
  color: #d95757;
}

.coin-log-section-head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
}

.coin-log-section-head text:last-child {
  color: #8a7a68;
  font-size: 23rpx;
}

.coin-log-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
  margin-top: 16rpx;
}

.coin-log-item {
  align-items: center;
  border-radius: 22rpx;
  display: flex;
  gap: 18rpx;
  justify-content: space-between;
  padding: 20rpx;
}

.coin-log-item__main {
  min-width: 0;
}

.coin-log-item__reason {
  color: #253047;
  font-size: 28rpx;
  font-weight: 800;
}

.coin-log-item__time {
  font-size: 23rpx;
  margin-top: 8rpx;
}

.coin-log-item__amount {
  flex: 0 0 auto;
  font-size: 34rpx;
  font-weight: 900;
}

.coin-log-item--gain .coin-log-item__amount {
  color: #2f9b64;
}

.coin-log-item--consume .coin-log-item__amount {
  color: #d95757;
}

.coin-log-empty {
  border-style: dashed;
  border-radius: 24rpx;
  font-size: 26rpx;
  line-height: 1.5;
  margin-top: 16rpx;
  padding: 30rpx;
}
</style>
