const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command
const taskRecords = db.collection('user_tasks')
const now = () => new Date().toISOString()

const taskCategories = ['schedule', 'study', 'work', 'health', 'life']
const taskKinds = ['task', 'ddl']
const taskRepeatTypes = ['once', 'daily', 'weekly']
const taskStatuses = ['pending', 'completed', 'delayed', 'skipped']
const taskPriorities = ['low', 'medium', 'high']
const rewardTypes = ['snack', 'coin', 'toy', 'mood', 'bond']

const normalizeText = (value, maxLength) => {
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
  return text.length > maxLength ? text.slice(0, maxLength) : text
}

const normalizeEnum = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

const sanitizeSubtasks = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      const title = normalizeText(item?.title, 80)
      if (!title) {
        return null
      }

      return {
        id: normalizeText(item?.id, 60) || `subtask-${index + 1}`,
        title,
        completed: Boolean(item?.completed),
      }
    })
    .filter(Boolean)
    .slice(0, 30)
}

const sanitizeTask = (item, index) => {
  const title = normalizeText(item?.title, 120)
  if (!title) {
    return null
  }

  const kind = normalizeEnum(item?.kind, taskKinds, 'task')

  return {
    id: normalizeText(item?.id, 60) || `task-${index + 1}`,
    title,
    kind,
    icon: normalizeText(item?.icon, 16),
    borderColor: normalizeText(item?.borderColor, 24),
    notes: normalizeText(item?.notes, 500),
    category: normalizeEnum(item?.category, taskCategories, kind === 'ddl' ? 'schedule' : 'work'),
    time: normalizeText(item?.time, 8) || (kind === 'ddl' ? '23:59' : '09:00'),
    dueDate: normalizeText(item?.dueDate, 20),
    repeatType: normalizeEnum(item?.repeatType, taskRepeatTypes, 'once'),
    status: normalizeEnum(item?.status, taskStatuses, 'pending'),
    priority: normalizeEnum(item?.priority, taskPriorities, 'medium'),
    isStarred: Boolean(item?.isStarred),
    rewardType: normalizeEnum(item?.rewardType, rewardTypes, 'mood'),
    subtasks: sanitizeSubtasks(item?.subtasks),
    createdAt: normalizeText(item?.createdAt, 40) || now(),
    completedAt: normalizeText(item?.completedAt, 40),
  }
}

const sanitizeTasks = (value) =>
  (Array.isArray(value) ? value : [])
    .map((item, index) => sanitizeTask(item, index))
    .filter(Boolean)
    .slice(0, 200)

const keepSingleByOpenid = async (openid) => {
  const result = await taskRecords
    .where(
      _.or([
        { _openid: openid },
        { ownerOpenid: openid },
      ]),
    )
    .limit(100)
    .get()
  const records = result.data || []

  if (!records.length) {
    return null
  }

  const [primary, ...duplicates] = records
  if (duplicates.length) {
    await Promise.all(
      duplicates
        .filter((item) => item && item._id)
        .map((item) => taskRecords.doc(item._id).remove()),
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
      tasks: existing && Array.isArray(existing.tasks) ? existing.tasks : [],
      updatedAt: normalizeText(existing?.updatedAt, 40),
    }
  }

  const updatedAt = normalizeText(event.updatedAt, 40) || now()

  if (action === 'clear') {
    if (existing?._id) {
      await taskRecords.doc(existing._id).update({
        data: {
          tasks: [],
          updatedAt,
        },
      })
    }

    return {
      tasks: [],
      updatedAt,
    }
  }

  const tasks = sanitizeTasks(event.tasks)
  const payload = {
    _openid: OPENID,
    ownerOpenid: OPENID,
    tasks,
    updatedAt,
  }

  if (!existing) {
    await taskRecords.add({
      data: {
        ...payload,
        createdAt: now(),
      },
    })
  } else {
    await taskRecords.doc(existing._id).update({
      data: payload,
    })
  }

  return {
    tasks,
    updatedAt,
  }
}
