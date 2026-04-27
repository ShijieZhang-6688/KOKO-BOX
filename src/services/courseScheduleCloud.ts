import { isWechatCloudConfigured } from '../config/cloud'
import type { CourseSchedule, ScheduleCourse, ScheduleWeekday } from '../types/koko'

interface WechatCloudApi {
  callFunction?: (options: unknown) => Promise<{ result: unknown }>
}

const getWechatCloudApi = () =>
  (globalThis as { wx?: { cloud?: WechatCloudApi } }).wx?.cloud

const callWechatCloudFunction = async <T>(name: string, data?: Record<string, unknown>, timeout = 20000) => {
  const wxCloud = getWechatCloudApi()

  if (!wxCloud?.callFunction) {
    throw new Error('WeChat cloud is not available in this environment.')
  }

  const response = await wxCloud.callFunction({
    name,
    data,
    timeout,
  })

  return response.result as T
}

const normalizeText = (value: unknown, maxLength: number) => {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const normalizeWeekday = (value: unknown): ScheduleWeekday => {
  const weekday = Number(value)
  return weekday >= 1 && weekday <= 7 ? (weekday as ScheduleWeekday) : 1
}

const normalizeCourse = (item: Partial<ScheduleCourse>, index: number): ScheduleCourse => ({
  id: normalizeText(item.id, 40) || `course-${index + 1}`,
  name: normalizeText(item.name, 60),
  weekday: normalizeWeekday(item.weekday),
  startTime: normalizeText(item.startTime, 8),
  endTime: normalizeText(item.endTime, 8),
  location: normalizeText(item.location, 40),
  teacher: normalizeText(item.teacher, 60),
  weeks: normalizeText(item.weeks, 40),
})

const normalizeSchedule = (value: unknown): CourseSchedule | null => {
  const schedule = (value ?? {}) as Partial<CourseSchedule> & { courses?: unknown }
  if (!Array.isArray(schedule.courses)) {
    return null
  }

  const courses = schedule.courses
    .map((item, index) => normalizeCourse((item ?? {}) as Partial<ScheduleCourse>, index))
    .filter((item) => item.name && item.startTime && item.endTime)

  if (!courses.length) {
    return null
  }

  return {
    id: normalizeText(schedule.id, 40) || `schedule-${Date.now()}`,
    importedAt: normalizeText(schedule.importedAt, 40) || new Date().toISOString(),
    sourceFileID: normalizeText(schedule.sourceFileID, 200) || undefined,
    courses,
  }
}

export const loadCourseScheduleFromCloud = async () => {
  if (!isWechatCloudConfigured()) {
    return null
  }

  try {
    const result = await callWechatCloudFunction<{ schedule?: unknown }>('schedule-sync', {
      action: 'load',
    })
    return normalizeSchedule(result.schedule)
  } catch {
    return null
  }
}

export const saveCourseScheduleToCloud = async (schedule: CourseSchedule) => {
  if (!isWechatCloudConfigured()) {
    return null
  }

  const normalized = normalizeSchedule(schedule)
  if (!normalized) {
    throw new Error('Invalid course schedule payload.')
  }

  const result = await callWechatCloudFunction<{ schedule?: unknown }>(
    'schedule-sync',
    {
      action: 'save',
      schedule: normalized,
    },
    30000,
  )

  return normalizeSchedule(result.schedule)
}

export const clearCourseScheduleFromCloud = async () => {
  if (!isWechatCloudConfigured()) {
    return
  }

  try {
    await callWechatCloudFunction('schedule-sync', {
      action: 'clear',
    })
  } catch {
    // Ignore cloud clear failures so local state can still clear.
  }
}
