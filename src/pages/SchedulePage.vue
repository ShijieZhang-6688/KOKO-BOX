<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCourseScheduleImporter } from '../composables/useCourseScheduleImporter'
import { useKokoState } from '../composables/useKokoState'
import { useLanguage } from '../composables/useLanguage'
import type { ScheduleCourse, ScheduleWeekday } from '../types/koko'

type ScheduleSlot = {
  key: string
  label: string
  minutes: number
  row: number
}

type ScheduleCell = {
  key: string
  weekday: ScheduleWeekday
  slot: ScheduleSlot
}

type CourseLayout = {
  course: ScheduleCourse
  style: string
}

type DragTarget = {
  weekday: ScheduleWeekday
  slotKey: string
  minutes: number
}

const DEFAULT_START_MINUTES = 9 * 60
const DEFAULT_END_MINUTES = 19 * 60
const SLOT_MINUTES = 30
const TIME_COLUMN_WIDTH = 76
const DAY_COLUMN_WIDTH = 96
const ROW_HEIGHT = 54
const HEADER_HEIGHT = 54
const LONG_PRESS_MS = 450

const { courseSchedule, setCourseSchedule } = useKokoState()
const { t } = useLanguage()
const {
  showScheduleImporter,
  importingSchedule,
  scheduleImportError,
  openScheduleImporter,
  closeScheduleImporter,
  importScheduleFromScreenshot,
} = useCourseScheduleImporter()

const dragCourseId = ref('')
const activeDragCourseId = ref('')
const dragTarget = ref<DragTarget | null>(null)
const scrollLeft = ref(0)
const scrollTop = ref(0)
let longPressTimer: ReturnType<typeof setTimeout> | undefined
let dragStartX = 0
let dragStartY = 0

const weekdayColumns = computed<Array<{ key: ScheduleWeekday; label: string }>>(() =>
  t.value.schedule.weekdays.map((label, index) => ({
    key: (index + 1) as ScheduleWeekday,
    label,
  })),
)

const importedCourses = computed(() => courseSchedule.value?.courses ?? [])
const hasCourseSchedule = computed(() => importedCourses.value.length > 0)

const parseTimeToMinutes = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null
  }

  return hours * 60 + minutes
}

const formatMinutes = (value: number) => {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, Math.round(value)))
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

const floorToSlot = (value: number) => Math.floor(value / SLOT_MINUTES) * SLOT_MINUTES
const ceilToSlot = (value: number) => Math.ceil(value / SLOT_MINUTES) * SLOT_MINUTES

const scheduleBounds = computed(() => {
  const startCandidates = importedCourses.value
    .map((course) => parseTimeToMinutes(course.startTime))
    .filter((value): value is number => value !== null)
  const endCandidates = importedCourses.value
    .map((course) => parseTimeToMinutes(course.endTime))
    .filter((value): value is number => value !== null)

  const start = Math.min(DEFAULT_START_MINUTES, ...startCandidates)
  const end = Math.max(DEFAULT_END_MINUTES, ...endCandidates)

  return {
    start: floorToSlot(start),
    end: ceilToSlot(end),
  }
})

const scheduleSlots = computed<ScheduleSlot[]>(() => {
  const slots: ScheduleSlot[] = []
  for (let minutes = scheduleBounds.value.start; minutes <= scheduleBounds.value.end; minutes += SLOT_MINUTES) {
    slots.push({
      key: formatMinutes(minutes),
      label: formatMinutes(minutes),
      minutes,
      row: slots.length + 2,
    })
  }
  return slots
})

const scheduleCells = computed<ScheduleCell[]>(() =>
  scheduleSlots.value.slice(0, -1).flatMap((slot) =>
    weekdayColumns.value.map((weekday) => ({
      key: `${weekday.key}-${slot.key}`,
      weekday: weekday.key,
      slot,
    })),
  ),
)

const targetCellKey = computed(() => (dragTarget.value ? `${dragTarget.value.weekday}-${dragTarget.value.slotKey}` : ''))

const scheduleTrackStyle = computed(() => {
  const bodyRows = Math.max(1, scheduleSlots.value.length - 1)
  return [
    `grid-template-columns: ${TIME_COLUMN_WIDTH}px repeat(7, ${DAY_COLUMN_WIDTH}px)`,
    `grid-template-rows: ${HEADER_HEIGHT}px repeat(${bodyRows}, ${ROW_HEIGHT}px)`,
    `min-width: ${TIME_COLUMN_WIDTH + DAY_COLUMN_WIDTH * 7}px`,
  ].join('; ')
})

const getCourseDuration = (course: ScheduleCourse) => {
  const start = parseTimeToMinutes(course.startTime)
  const end = parseTimeToMinutes(course.endTime)
  if (start === null || end === null || end <= start) return SLOT_MINUTES
  return end - start
}

const courseLayouts = computed<CourseLayout[]>(() =>
  importedCourses.value.map((course, index) => {
    const parsedStart = parseTimeToMinutes(course.startTime) ?? scheduleBounds.value.start
    const parsedEnd = parseTimeToMinutes(course.endTime) ?? parsedStart + SLOT_MINUTES
    const start = Math.max(scheduleBounds.value.start, floorToSlot(parsedStart))
    const end = Math.max(start + SLOT_MINUTES, Math.min(scheduleBounds.value.end, ceilToSlot(parsedEnd)))
    const startRow = Math.floor((start - scheduleBounds.value.start) / SLOT_MINUTES) + 2
    const endRow = Math.floor((end - scheduleBounds.value.start) / SLOT_MINUTES) + 2
    const column = Math.max(1, Math.min(7, course.weekday)) + 1

    return {
      course,
      style: [
        `grid-column: ${column}`,
        `grid-row: ${startRow} / ${endRow}`,
        `z-index: ${activeDragCourseId.value === course.id ? 5 : 3 + (index % 2)}`,
      ].join('; '),
    }
  }),
)

const touchPoint = (event: any) => {
  const touch = event?.touches?.[0] ?? event?.changedTouches?.[0]
  return {
    x: touch?.pageX ?? 0,
    y: touch?.pageY ?? 0,
  }
}

const clearLongPressTimer = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = undefined
  }
}

const updateDragTarget = (pageX: number, pageY: number) => {
  const query = uni.createSelectorQuery()
  query
    .select('.planner-schedule-grid--page')
    .boundingClientRect((rect) => {
      if (!rect || Array.isArray(rect)) return
      const localX = pageX - rect.left + scrollLeft.value
      const localY = pageY - rect.top + scrollTop.value
      const dayIndex = Math.floor((localX - TIME_COLUMN_WIDTH) / DAY_COLUMN_WIDTH)
      const slotIndex = Math.floor((localY - HEADER_HEIGHT) / ROW_HEIGHT)
      const maxSlotIndex = Math.max(0, scheduleSlots.value.length - 2)

      if (dayIndex < 0 || dayIndex > 6 || slotIndex < 0 || slotIndex > maxSlotIndex) {
        dragTarget.value = null
        return
      }

      const slot = scheduleSlots.value[Math.min(slotIndex, maxSlotIndex)]
      dragTarget.value = {
        weekday: (dayIndex + 1) as ScheduleWeekday,
        slotKey: slot.key,
        minutes: slot.minutes,
      }
    })
    .exec()
}

const beginCourseDrag = (course: ScheduleCourse, event: any) => {
  clearLongPressTimer()
  const point = touchPoint(event)
  dragStartX = point.x
  dragStartY = point.y
  dragCourseId.value = course.id
  dragTarget.value = null
  longPressTimer = setTimeout(() => {
    activeDragCourseId.value = course.id
    updateDragTarget(dragStartX, dragStartY)
  }, LONG_PRESS_MS)
}

const moveCourseDrag = (event: any) => {
  const point = touchPoint(event)
  if (!activeDragCourseId.value) {
    if (Math.abs(point.x - dragStartX) > 8 || Math.abs(point.y - dragStartY) > 8) {
      clearLongPressTimer()
      dragCourseId.value = ''
    }
    return
  }

  updateDragTarget(point.x, point.y)
}

const finishCourseDrag = async () => {
  clearLongPressTimer()
  const courseId = activeDragCourseId.value || dragCourseId.value
  const target = dragTarget.value
  activeDragCourseId.value = ''
  dragCourseId.value = ''
  dragTarget.value = null

  if (!courseId || !target || !courseSchedule.value) return

  const course = importedCourses.value.find((item) => item.id === courseId)
  if (!course) return

  const duration = getCourseDuration(course)
  const nextStartTime = formatMinutes(target.minutes)
  const nextEndTime = formatMinutes(target.minutes + duration)

  if (course.weekday === target.weekday && course.startTime === nextStartTime) return

  const nextCourses = importedCourses.value.map((item) =>
    item.id === courseId
      ? {
          ...item,
          weekday: target.weekday,
          startTime: nextStartTime,
          endTime: nextEndTime,
        }
      : item,
  )

  await setCourseSchedule({
    ...courseSchedule.value,
    courses: nextCourses,
    importedAt: new Date().toISOString(),
  })
}

const handleScheduleScroll = (event: any) => {
  scrollLeft.value = Number(event?.detail?.scrollLeft ?? 0)
  scrollTop.value = Number(event?.detail?.scrollTop ?? 0)
}

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
      <button class="planner-schedule-back" :aria-label="t.schedule.back" @click="backToPlanner">←</button>
      <view class="planner-schedule-title">{{ t.schedule.title }}</view>
      <button class="planner-schedule-change planner-schedule-change--top" @click="openScheduleImporter">{{ t.schedule.change }}</button>
    </view>

    <view v-if="hasCourseSchedule" class="planner-schedule-page-body">
      <scroll-view
        class="planner-schedule-grid planner-schedule-grid--page"
        scroll-x
        scroll-y
        enhanced
        :show-scrollbar="false"
        @scroll="handleScheduleScroll"
      >
        <view class="planner-schedule-track" :style="scheduleTrackStyle">
          <view class="planner-schedule-head planner-schedule-time-head">{{ t.schedule.time }}</view>
          <view
            v-for="weekday in weekdayColumns"
            :key="weekday.key"
            class="planner-schedule-head"
            :style="`grid-column: ${weekday.key + 1}; grid-row: 1`"
          >
            {{ weekday.label }}
          </view>

          <view
            v-for="slot in scheduleSlots.slice(0, -1)"
            :key="slot.key"
            class="planner-schedule-time"
            :style="`grid-column: 1; grid-row: ${slot.row}`"
          >
            {{ slot.label }}
          </view>

          <view
            v-for="cell in scheduleCells"
            :key="cell.key"
            class="planner-schedule-cell"
            :class="{ 'planner-schedule-cell--target': targetCellKey === cell.key }"
            :style="`grid-column: ${cell.weekday + 1}; grid-row: ${cell.slot.row}`"
          />

          <view
            v-for="layout in courseLayouts"
            :key="layout.course.id"
            class="planner-schedule-course"
            :class="{ 'planner-schedule-course--dragging': activeDragCourseId === layout.course.id }"
            :style="layout.style"
            @touchstart.stop="beginCourseDrag(layout.course, $event)"
            @touchmove.stop.prevent="moveCourseDrag"
            @touchend.stop="finishCourseDrag"
            @touchcancel.stop="finishCourseDrag"
          >
            <view class="planner-schedule-course__name">{{ layout.course.name }}</view>
            <view v-if="layout.course.teacher" class="planner-schedule-course__meta">{{ layout.course.teacher }}</view>
            <view v-if="layout.course.location" class="planner-schedule-course__meta">{{ layout.course.location }}</view>
            <view v-if="layout.course.weeks" class="planner-schedule-course__meta">{{ layout.course.weeks }}</view>
            <view class="planner-schedule-course__meta">{{ layout.course.startTime }} - {{ layout.course.endTime }}</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-else class="planner-schedule-empty-page">
      <view class="planner-schedule-empty-page__title">{{ t.schedule.emptyTitle }}</view>
      <view class="planner-schedule-empty-page__copy">{{ t.schedule.emptyCopy }}</view>
      <button class="planner-schedule-change" @click="openScheduleImporter">{{ t.schedule.importSchedule }}</button>
    </view>

    <view v-if="showScheduleImporter" class="planner-punch-choice-mask" @click="closeScheduleImporter">
      <view class="planner-schedule-importer" @click.stop>
        <view class="planner-punch-editor__title">{{ t.schedule.title }}</view>
        <view class="planner-schedule-importer__copy">{{ t.schedule.importerCopy }}</view>
        <button class="planner-schedule-importer__primary" :disabled="importingSchedule" @click="importScheduleFromScreenshot">
          {{ importingSchedule ? t.schedule.recognizing : t.schedule.importSchedule }}
        </button>
        <button class="planner-schedule-importer__ghost" :disabled="importingSchedule" @click="closeScheduleImporter">{{ t.schedule.cancel }}</button>
        <view v-if="scheduleImportError" class="planner-schedule-importer__error">{{ scheduleImportError }}</view>
      </view>
    </view>
  </view>
</template>
