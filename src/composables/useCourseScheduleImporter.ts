import { ref } from 'vue'
import { useKokoState } from './useKokoState'
import { recognizeScheduleFromImage } from '../services/petDialogue'
import type { CourseSchedule } from '../types/koko'

interface WechatCloudApi {
  uploadFile?: (options: {
    cloudPath: string
    filePath: string
  }) => Promise<{ fileID: string }>
}

const getWechatCloudApi = () =>
  (globalThis as { wx?: { cloud?: WechatCloudApi } }).wx?.cloud

const chooseScheduleImage = () =>
  new Promise<string>((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ['original'],
      sourceType: ['album'],
      success: (result) => {
        const filePath = result.tempFilePaths?.[0]
        if (filePath) {
          resolve(filePath)
          return
        }

        reject(new Error('未选择课表截图'))
      },
      fail: reject,
    })
  })

const uploadScheduleImage = async (filePath: string) => {
  const wxCloud = getWechatCloudApi()
  if (!wxCloud?.uploadFile) {
    throw new Error('微信云上传不可用')
  }

  const extension = filePath.includes('.') ? filePath.slice(filePath.lastIndexOf('.')).split('?')[0] : '.png'
  const safeExtension = ['.jpg', '.jpeg', '.png', '.webp'].includes(extension.toLowerCase()) ? extension : '.png'
  const { fileID } = await wxCloud.uploadFile({
    cloudPath: `schedules/${Date.now()}${safeExtension}`,
    filePath,
  })

  return fileID
}

const getScheduleImportErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '')

  if (message.includes('FUNCTIONS_TIME_LIMIT_EXCEEDED') || message.includes('timed out')) {
    return 'AI 识别超时，请确认 pet-dialogue 云函数超时时间为 60 秒后再试。'
  }

  if (message.includes('QWEN_API_KEY')) {
    return 'AI 密钥未配置，请检查 pet-dialogue 云函数环境变量。'
  }

  return message || '识别失败，请查看云函数日志。'
}

export const useCourseScheduleImporter = (options?: { onImported?: () => void }) => {
  const { setCourseSchedule } = useKokoState()
  const showScheduleImporter = ref(false)
  const importingSchedule = ref(false)
  const scheduleImportError = ref('')

  const openScheduleImporter = () => {
    scheduleImportError.value = ''
    showScheduleImporter.value = true
  }

  const closeScheduleImporter = () => {
    if (importingSchedule.value) return
    showScheduleImporter.value = false
  }

  const importScheduleFromScreenshot = async () => {
    if (importingSchedule.value) return

    importingSchedule.value = true
    scheduleImportError.value = ''

    try {
      const filePath = await chooseScheduleImage()
      const fileID = await uploadScheduleImage(filePath)
      const courses = await recognizeScheduleFromImage(fileID)
      const nextSchedule: CourseSchedule = {
        id: `schedule-${Date.now()}`,
        courses,
        importedAt: new Date().toISOString(),
        sourceFileID: fileID,
      }

      await setCourseSchedule(nextSchedule)
      showScheduleImporter.value = false
      uni.showToast({ title: '课表已导入', icon: 'success' })
      options?.onImported?.()
    } catch (error) {
      scheduleImportError.value = getScheduleImportErrorMessage(error)
    } finally {
      importingSchedule.value = false
    }
  }

  return {
    showScheduleImporter,
    importingSchedule,
    scheduleImportError,
    openScheduleImporter,
    closeScheduleImporter,
    importScheduleFromScreenshot,
  }
}
