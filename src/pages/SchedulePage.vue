<script setup lang="ts">
import { computed } from 'vue'
import { useCourseScheduleImporter } from '../composables/useCourseScheduleImporter'
import { useKokoState } from '../composables/useKokoState'
import type { ScheduleCourse, ScheduleWeekday } from '../types/koko'

type ScheduleCell = {
  weekday: ScheduleWeekday
  courses: ScheduleCourse[]
}

type ScheduleRow = {
  key: string
  timeLabel: string
  cells: ScheduleCell[]
}

const { courseSchedule } = useKokoState()
const {
  showScheduleImporter,
  importingSchedule,
  scheduleImportError,
  openScheduleImporter,
  closeScheduleImporter,
  importScheduleFromScreenshot,
} = useCourseScheduleImporter()

const weekdayColumns: Array<{ key: ScheduleWeekday; label: string }> = [
  { key: 1, label: '周一' },
  { key: 2, label: '周二' },
  { key: 3, label: '周三' },
  { key: 4, label: '周四' },
  { key: 5, label: '周五' },
  { key: 6, label: '周六' },
  { key: 7, label: '周日' },
]

const importedCourses = computed(() => courseSchedule.value?.courses ?? [])
const hasCourseSchedule = computed(() => importedCourses.value.length > 0)

const scheduleRows = computed<ScheduleRow[]>(() => {
  const slots = Array.from(
    new Set(importedCourses.value.map((course) => `${course.startTime}-${course.endTime}`).filter((slot) => slot !== '-')),
  ).sort()

  return slots.map((slot) => {
    const [startTime, endTime] = slot.split('-')

    return {
      key: slot,
      timeLabel: `${startTime}\n${endTime}`,
      cells: weekdayColumns.map((weekday) => ({
        weekday: weekday.key,
        courses: importedCourses.value.filter(
          (course) => course.weekday === weekday.key && course.startTime === startTime && course.endTime === endTime,
        ),
      })),
    }
  })
})

const backToPlanner = () => {
  const pageStack = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pageStack.length > 1) {
    uni.navigateBack()
    return
  }

  uni.switchTab({ url: '/pages/planner/index' })
}
</script>

<template>
  <view class="planner-schedule-page">
    <view class="planner-schedule-topbar">
      <button class="planner-schedule-back" aria-label="返回待办首页" @click="backToPlanner">←</button>
      <view class="planner-schedule-title">我的课表</view>
      <button class="planner-schedule-change planner-schedule-change--top" @click="openScheduleImporter">更换课表</button>
    </view>

    <view v-if="hasCourseSchedule" class="planner-schedule-page-body">
      <view class="planner-schedule-grid planner-schedule-grid--page">
        <view class="planner-schedule-head planner-schedule-time-head">时间</view>
        <view v-for="weekday in weekdayColumns" :key="weekday.key" class="planner-schedule-head">
          {{ weekday.label }}
        </view>
        <template v-for="row in scheduleRows" :key="row.key">
          <view class="planner-schedule-time">{{ row.timeLabel }}</view>
          <view v-for="cell in row.cells" :key="`${row.key}-${cell.weekday}`" class="planner-schedule-cell">
            <view v-for="course in cell.courses" :key="course.id" class="planner-schedule-course">
              <view class="planner-schedule-course__name">{{ course.name }}</view>
              <view v-if="course.location" class="planner-schedule-course__meta">{{ course.location }}</view>
              <view v-if="course.weeks" class="planner-schedule-course__meta">{{ course.weeks }}</view>
            </view>
          </view>
        </template>
      </view>
    </view>

    <view v-else class="planner-schedule-empty-page">
      <view class="planner-schedule-empty-page__title">还没有课表</view>
      <view class="planner-schedule-empty-page__copy">导入课程表截图后，这里会显示周课表。</view>
      <button class="planner-schedule-change" @click="openScheduleImporter">导入课表截图</button>
    </view>

    <view v-if="showScheduleImporter" class="planner-punch-choice-mask" @click="closeScheduleImporter">
      <view class="planner-schedule-importer" @click.stop>
        <view class="planner-punch-editor__title">我的课表</view>
        <view class="planner-schedule-importer__copy">上传课程表截图，AI 会识别并生成周课表。</view>
        <button class="planner-schedule-importer__primary" :disabled="importingSchedule" @click="importScheduleFromScreenshot">
          {{ importingSchedule ? '识别中...' : '导入课表截图' }}
        </button>
        <button class="planner-schedule-importer__ghost" :disabled="importingSchedule" @click="closeScheduleImporter">取消</button>
        <view v-if="scheduleImportError" class="planner-schedule-importer__error">{{ scheduleImportError }}</view>
      </view>
    </view>
  </view>
</template>
