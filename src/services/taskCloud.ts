import { isWechatCloudConfigured } from '../config/cloud'
import type {
  RewardType,
  Task,
  TaskCategory,
  TaskKind,
  TaskPriority,
  TaskRepeatType,
  TaskStatus,
} from '../types/koko'

interface WechatCloudApi {
  callFunction?: (options: unknown) => Promise<{ result: unknown }>
}

export interface CloudTasksSnapshot {
  tasks: Task[]
  updatedAt: string
}

const taskCategories: TaskCategory[] = ['schedule', 'study', 'work', 'health', 'life']
const taskKinds: TaskKind[] = ['task', 'ddl']
const taskRepeatTypes: TaskRepeatType[] = ['once', 'daily', 'weekly']
const taskStatuses: TaskStatus[] = ['pending', 'completed', 'delayed', 'skipped']
const taskPriorities: TaskPriority[] = ['low', 'medium', 'high']
const rewardTypes: RewardType[] = ['snack', 'coin', 'toy', 'mood', 'bond']

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

const normalizeEnum = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback

const normalizeSubtasks = (value: unknown): Task['subtasks'] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      const subtask = (item ?? {}) as Partial<NonNullable<Task['subtasks']>[number]>
      const title = normalizeText(subtask.title, 80)

      if (!title) {
        return null
      }

      return {
        id: normalizeText(subtask.id, 60) || `subtask-${index + 1}`,
        title,
        completed: Boolean(subtask.completed),
      }
    })
    .filter((item): item is NonNullable<Task['subtasks']>[number] => Boolean(item))
    .slice(0, 30)
}

export const normalizeCloudTask = (item: Partial<Task>, index: number): Task | null => {
  const title = normalizeText(item.title, 120)

  if (!title) {
    return null
  }

  const kind = normalizeEnum(item.kind, taskKinds, 'task')
  const dueDate = normalizeText(item.dueDate, 20)

  return {
    id: normalizeText(item.id, 60) || `task-${index + 1}`,
    title,
    kind,
    icon: normalizeText(item.icon, 16) || undefined,
    borderColor: normalizeText(item.borderColor, 24) || undefined,
    notes: normalizeText(item.notes, 500),
    category: normalizeEnum(item.category, taskCategories, kind === 'ddl' ? 'schedule' : 'work'),
    time: normalizeText(item.time, 8) || (kind === 'ddl' ? '23:59' : '09:00'),
    dueDate,
    repeatType: normalizeEnum(item.repeatType, taskRepeatTypes, 'once'),
    status: normalizeEnum(item.status, taskStatuses, 'pending'),
    priority: normalizeEnum(item.priority, taskPriorities, 'medium'),
    isStarred: Boolean(item.isStarred),
    rewardType: normalizeEnum(item.rewardType, rewardTypes, 'mood'),
    subtasks: normalizeSubtasks(item.subtasks),
    createdAt: normalizeText(item.createdAt, 40) || new Date().toISOString(),
    completedAt: normalizeText(item.completedAt, 40) || undefined,
  }
}

const normalizeTasksSnapshot = (value: unknown): CloudTasksSnapshot => {
  const snapshot = (value ?? {}) as { tasks?: unknown; updatedAt?: unknown }
  const tasks = Array.isArray(snapshot.tasks)
    ? snapshot.tasks
        .map((item, index) => normalizeCloudTask((item ?? {}) as Partial<Task>, index))
        .filter((item): item is Task => Boolean(item))
        .slice(0, 200)
    : []

  return {
    tasks,
    updatedAt: normalizeText(snapshot.updatedAt, 40) || '',
  }
}

export const loadTasksFromCloud = async () => {
  if (!isWechatCloudConfigured()) {
    return null
  }

  const result = await callWechatCloudFunction<{ tasks?: unknown; updatedAt?: unknown }>('task-sync', {
    action: 'load',
  })

  return normalizeTasksSnapshot(result)
}

export const saveTasksToCloud = async (tasks: Task[], updatedAt: string) => {
  if (!isWechatCloudConfigured()) {
    return null
  }

  const normalized = normalizeTasksSnapshot({ tasks, updatedAt })
  const result = await callWechatCloudFunction<{ tasks?: unknown; updatedAt?: unknown }>(
    'task-sync',
    {
      action: 'save',
      tasks: normalized.tasks,
      updatedAt: normalized.updatedAt || new Date().toISOString(),
    },
    30000,
  )

  return normalizeTasksSnapshot(result)
}

export const clearTasksFromCloud = async () => {
  if (!isWechatCloudConfigured()) {
    return null
  }

  const result = await callWechatCloudFunction<{ tasks?: unknown; updatedAt?: unknown }>('task-sync', {
    action: 'clear',
  })

  return normalizeTasksSnapshot(result)
}
