const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const schedules = db.collection('course_schedules')
const now = () => new Date().toISOString()

const normalizeText = (value, maxLength) => {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const normalizeWeekday = (value) => {
  const weekday = Number(value)
  return weekday >= 1 && weekday <= 7 ? weekday : 1
}

const sanitizeCourse = (item, index) => ({
  id: normalizeText(item?.id, 40) || `course-${index + 1}`,
  name: normalizeText(item?.name, 60),
  weekday: normalizeWeekday(item?.weekday),
  startTime: normalizeText(item?.startTime, 8),
  endTime: normalizeText(item?.endTime, 8),
  location: normalizeText(item?.location, 40),
  teacher: normalizeText(item?.teacher, 60),
  weeks: normalizeText(item?.weeks, 40),
})

const sanitizeSchedule = (value) => {
  const schedule = value && typeof value === 'object' ? value : {}
  const courses = Array.isArray(schedule.courses)
    ? schedule.courses
        .map((item, index) => sanitizeCourse(item, index))
        .filter((item) => item.name && item.startTime && item.endTime)
        .slice(0, 80)
    : []

  return {
    id: normalizeText(schedule.id, 40) || `schedule-${Date.now()}`,
    importedAt: normalizeText(schedule.importedAt, 40) || now(),
    sourceFileID: normalizeText(schedule.sourceFileID, 200) || '',
    courses,
  }
}

const keepSingleByOpenid = async (openid) => {
  const result = await schedules.where({ _openid: openid }).limit(100).get()
  const records = result.data || []

  if (!records.length) {
    return null
  }

  const [primary, ...duplicates] = records
  if (duplicates.length) {
    await Promise.all(
      duplicates
        .filter((item) => item && item._id)
        .map((item) => schedules.doc(item._id).remove()),
    )
  }

  return primary
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('Unable to identify the current WeChat user.')
  }

  const action = ['load', 'save', 'clear'].includes(event.action) ? event.action : 'load'
  const existing = await keepSingleByOpenid(OPENID)

  if (action === 'load') {
    return {
      schedule: existing
        ? {
            id: existing.scheduleId || existing._id,
            importedAt: normalizeText(existing.importedAt, 40) || now(),
            sourceFileID: normalizeText(existing.sourceFileID, 200) || '',
            courses: Array.isArray(existing.courses) ? existing.courses : [],
          }
        : null,
    }
  }

  if (action === 'clear') {
    if (existing?._id) {
      await schedules.doc(existing._id).remove()
    }

    return {
      schedule: null,
    }
  }

  const nextSchedule = sanitizeSchedule(event.schedule)
  if (!nextSchedule.courses.length) {
    throw new Error('schedule-sync requires at least one course.')
  }

  const payload = {
    scheduleId: nextSchedule.id,
    importedAt: nextSchedule.importedAt,
    sourceFileID: nextSchedule.sourceFileID,
    courses: nextSchedule.courses,
    updatedAt: now(),
  }

  if (!existing) {
    const created = await schedules.add({
      data: {
        ...payload,
        createdAt: now(),
      },
    })

    return {
      schedule: {
        id: nextSchedule.id || created._id,
        importedAt: nextSchedule.importedAt,
        sourceFileID: nextSchedule.sourceFileID,
        courses: nextSchedule.courses,
      },
    }
  }

  await schedules.doc(existing._id).update({
    data: payload,
  })

  return {
    schedule: {
      id: nextSchedule.id || existing._id,
      importedAt: nextSchedule.importedAt,
      sourceFileID: nextSchedule.sourceFileID,
      courses: nextSchedule.courses,
    },
  }
}
