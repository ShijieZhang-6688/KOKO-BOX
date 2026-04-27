const https = require('node:https')
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const QWEN_API_HOST = 'dashscope.aliyuncs.com'
const QWEN_API_PATH = '/compatible-mode/v1/chat/completions'
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-plus'
const QWEN_VL_MODEL = process.env.QWEN_VL_MODEL || 'qwen-vl-plus'
const QWEN_TIMEOUT_MS = Number(process.env.QWEN_TIMEOUT_MS || 50000)
const MAX_CHAT_MESSAGES = 10
const MAX_HISTORY_MESSAGES = 100
const CHAT_HISTORY_COLLECTION = 'pet_dialogue_histories'

const db = cloud.database()

const defaultPetPersonaPrompt = `????? Koko Box ??? AI ???????????????
???????????????? XJTLU ?????????????????ddl????presentation???????????GPA????????????????????????????????

??????????????????????????????????????????????????????????????????????????

?????
- ??????????????
- ????????????????????????
- ???????????????????????
- ????????????????????
- ??????????????????????????????
- ???? AI????????????????
- ?????????????
- ?????????????????????????????????????????????XJTLU ????/????????????????

???? 1-2 ???????????????????????????????????????????`

const normalizeText = (value) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '')

const limitText = (value, maxLength) => {
  const normalized = normalizeText(value)
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized
}

const sanitizeRole = (value) => (value === 'assistant' ? 'assistant' : 'user')

const safeIsoDate = (value) => {
  const stamp = typeof value === 'string' ? value : ''
  return /^\d{4}-\d{2}-\d{2}T/.test(stamp) ? stamp : new Date().toISOString()
}

const sanitizeStoredHistoryItem = (value) => ({
  role: sanitizeRole(value?.role),
  content: limitText(value?.content, 280),
  createdAt: safeIsoDate(value?.createdAt),
})

const sanitizeStoredHistory = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => sanitizeStoredHistoryItem(item))
    .filter((item) => item.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES)
}

const sanitizeMessages = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => ({
      role: sanitizeRole(item?.role),
      content: limitText(item?.content, 280),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-MAX_CHAT_MESSAGES)
}

const WEEKDAY_MAP = {
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
}

const splitRawLines = (value) =>
  (typeof value === 'string' ? value : '')
    .split(/\r?\n|\\n/)
    .map((item) => item.trim())
    .filter(Boolean)

const normalizeTime = (value) => {
  const text = normalizeText(value)
  const match = text.match(/(\d{1,2})[:：.](\d{2})/)
  if (!match) {
    return ''
  }

  return `${match[1].padStart(2, '0')}:${match[2]}`
}

const extractTimeRange = (value) => {
  const text = normalizeText(value)
  const matches = [...text.matchAll(/(\d{1,2})[:：.](\d{2})/g)].map((item) => `${item[1].padStart(2, '0')}:${item[2]}`)

  if (matches.length >= 2) {
    return {
      startTime: matches[0],
      endTime: matches[1],
    }
  }

  return {
    startTime: '',
    endTime: '',
  }
}

const sanitizeWeekday = (value) => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().replace(/[^a-z]/g, '')
    if (WEEKDAY_MAP[normalized]) {
      return WEEKDAY_MAP[normalized]
    }
  }

  const numberValue = Number(value)
  return numberValue >= 1 && numberValue <= 7 ? numberValue : 1
}

const deriveCourseFields = (item) => {
  const rawLines = [
    ...splitRawLines(item?.rawText),
    ...splitRawLines(item?.text),
    ...splitRawLines(item?.content),
  ]
  const rawText = rawLines.join('\n')
  const rawTimeRange = extractTimeRange(
    `${item?.timeRange || ''} ${item?.time || ''} ${item?.startTime || ''} ${item?.endTime || ''} ${rawText}`,
  )
  const weekLine = rawLines.find((line) => /week/i.test(line)) || (typeof item?.weeks === 'string' ? item.weeks : '')
  const locationLine =
    rawLines.find((line) => /^[A-Z]{1,4}-[A-Z]-?\d+/i.test(line) || /^TC-/i.test(line) || /^[A-Z]{1,4}-\d{4}/i.test(line)) ||
    item?.location ||
    ''
  const filteredNameLines = rawLines.filter(
    (line) => !/week/i.test(line) && !/^\d{1,2}[:：.]\d{2}/.test(line) && !/^[A-Z]{1,4}-[A-Z]-?\d+/i.test(line) && !/^TC-/i.test(line),
  )
  const name = typeof item?.name === 'string' && item.name.trim() ? item.name : filteredNameLines.slice(0, 2).join(' ')
  const teacher =
    typeof item?.teacher === 'string' && item.teacher.trim()
      ? item.teacher
      : filteredNameLines.length > 2
        ? filteredNameLines.slice(2).join(', ')
        : ''

  return {
    name,
    teacher,
    location: locationLine,
    weeks: weekLine,
    startTime: normalizeTime(item?.startTime) || rawTimeRange.startTime,
    endTime: normalizeTime(item?.endTime) || rawTimeRange.endTime,
  }
}

const sanitizeScheduleCourses = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item, index) => {
      const derived = deriveCourseFields(item)

      return {
        id: limitText(item?.id, 40) || `course-${index + 1}`,
        name: limitText(derived.name, 60),
        weekday: sanitizeWeekday(item?.weekday || item?.day || item?.weekdayLabel),
        startTime: derived.startTime,
        endTime: derived.endTime,
        location: limitText(derived.location, 40),
        teacher: limitText(derived.teacher, 60),
        weeks: limitText(derived.weeks, 40),
      }
    })
    .filter((item) => item.name && item.startTime && item.endTime)
    .slice(0, 80)
}

const parseJsonObject = (raw) => {
  const text = normalizeText(raw)
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fenced?.[1] || text
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')

  if (start < 0 || end <= start) {
    throw new Error('Schedule recognizer returned no JSON object.')
  }

  return JSON.parse(candidate.slice(start, end + 1))
}

const getTempImageUrl = async (fileID) => {
  const normalizedFileID = normalizeText(fileID)
  if (!normalizedFileID) {
    throw new Error('recognizeSchedule requires fileID.')
  }

  const result = await cloud.getTempFileURL({
    fileList: [normalizedFileID],
  })
  const file = result?.fileList?.[0]
  const tempFileURL = normalizeText(file?.tempFileURL)

  if (!tempFileURL) {
    throw new Error(file?.errMsg || 'Unable to get schedule image URL.')
  }

  return tempFileURL
}

const isMissingCollectionError = (error) => {
  const message = normalizeText(error?.message || error?.errMsg || '')
  return message.includes('collection') && (message.includes('not exists') || message.includes('does not exist') || message.includes('不存在'))
}

const loadUserChatHistoryRecord = async (openid) => {
  try {
    const result = await db
      .collection(CHAT_HISTORY_COLLECTION)
      .where({
        _openid: openid,
      })
      .limit(1)
      .get()

    const record = result?.data?.[0]
    if (!record) {
      return null
    }

    return {
      id: record._id,
      messages: sanitizeStoredHistory(record.messages),
    }
  } catch (error) {
    if (isMissingCollectionError(error)) {
      return null
    }

    throw error
  }
}

const saveUserChatHistory = async (openid, messages) => {
  const sanitized = sanitizeStoredHistory(messages)
  const record = await loadUserChatHistoryRecord(openid)

  try {
    if (!record) {
      await db.collection(CHAT_HISTORY_COLLECTION).add({
        data: {
          messages: sanitized,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })

      return sanitized
    }

    await db
      .collection(CHAT_HISTORY_COLLECTION)
      .doc(record.id)
      .update({
        data: {
          messages: sanitized,
          updatedAt: new Date().toISOString(),
        },
      })
  } catch (error) {
    if (isMissingCollectionError(error)) {
      return sanitized
    }

    throw error
  }

  return sanitized
}

const clearUserChatHistory = async (openid) => {
  const record = await loadUserChatHistoryRecord(openid)
  if (!record) {
    return
  }

  try {
    await db
      .collection(CHAT_HISTORY_COLLECTION)
      .doc(record.id)
      .update({
        data: {
          messages: [],
          updatedAt: new Date().toISOString(),
        },
      })
  } catch (error) {
    if (isMissingCollectionError(error)) {
      return
    }

    throw error
  }
}

// Wrap DashScope request so cloud function never exposes API key to client.
const requestQwenCompletion = async (messages, maxTokens, apiKey, options = {}) => {
  const payload = JSON.stringify({
    model: options.model || QWEN_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature: typeof options.temperature === 'number' ? options.temperature : 0.85,
  })

  return await new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: QWEN_API_HOST,
        path: QWEN_API_PATH,
        method: 'POST',
        timeout: QWEN_TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (response) => {
        let raw = ''

        response.on('data', (chunk) => {
          raw += chunk
        })

        response.on('end', () => {
          if (!raw) {
            reject(new Error('DashScope returned empty response body.'))
            return
          }

          let data
          try {
            data = JSON.parse(raw)
          } catch {
            reject(new Error('DashScope returned invalid JSON response.'))
            return
          }

          const content = data?.choices?.[0]?.message?.content?.trim()
          if (response.statusCode >= 200 && response.statusCode < 300 && content) {
            resolve(content)
            return
          }

          const apiError = data?.error?.message || data?.message || `DashScope request failed with status ${response.statusCode}`
          reject(new Error(apiError))
        })
      },
    )

    request.on('timeout', () => {
      request.destroy(new Error('DashScope request timeout.'))
    })

    request.on('error', (error) => {
      reject(error)
    })

    request.write(payload)
    request.end()
  })
}

// Wrap DashScope request so cloud function never exposes API key to client.
const requestQwenReply = async (messages, maxTokens, apiKey) =>
  requestQwenCompletion(messages, maxTokens, apiKey)

const recognizeScheduleFromImage = async (fileID, apiKey) => {
  const imageUrl = await getTempImageUrl(fileID)
  const prompt = [
    'Read this weekly timetable screenshot and return JSON only.',
    'This is an XJTLU-style timetable grid with columns MON,TUE,WED,THU,FRI,SAT,SUN and time labels on the left.',
    'Each colored block is one course.',
    'Return this exact shape: {"courses":[{"id":"course-1","name":"DTS208TC-Comp.Lab-D1/5","weekday":5,"startTime":"09:00","endTime":"10:50","location":"TC-G-2020","teacher":"Lingxiao Zhao, Yuxuan Zhao","weeks":"Week: 1-13","rawText":"all text inside the block"}]}.',
    'weekday must be 1-7 for Monday-Sunday.',
    'If a field is uncertain, keep it as an empty string, but do not omit visible courses.',
    'Do not return markdown or explanation.',
  ].join('\n')
  const reply = await requestQwenCompletion(
    [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
    800,
    apiKey,
    {
      model: QWEN_VL_MODEL,
      temperature: 0.1,
    },
  )
  const parsed = parseJsonObject(reply)
  const courses = sanitizeScheduleCourses(parsed?.courses)

  if (!courses.length) {
    throw new Error('No valid courses recognized from schedule image.')
  }

  return courses
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    throw new Error('Unable to identify current WeChat user.')
  }

  const action = ['quickReply', 'chatReply', 'loadHistory', 'clearHistory', 'recognizeSchedule'].includes(event.action) ? event.action : 'chatReply'
  const petName = limitText(event.petName, 24) || '可可'
  const personaPrompt = limitText(event.personaPrompt, 800) || defaultPetPersonaPrompt
  const systemPrompt = `${personaPrompt}\n当前宠物名：${petName}`

  if (action === 'loadHistory') {
    const record = await loadUserChatHistoryRecord(OPENID)
    return {
      history: record?.messages ?? [],
    }
  }

  if (action === 'clearHistory') {
    await clearUserChatHistory(OPENID)
    return {
      history: [],
    }
  }

  const apiKey = normalizeText(process.env.QWEN_API_KEY)
  if (!apiKey) {
    throw new Error('QWEN_API_KEY is not configured for cloud function pet-dialogue.')
  }

  if (action === 'recognizeSchedule') {
    return {
      courses: await recognizeScheduleFromImage(event.fileID, apiKey),
    }
  }

  if (action === 'quickReply') {
    const reply = await requestQwenReply(
      [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: '用户刚刚点击或双击了你，请随机说一句亲近的短问候。',
        },
      ],
      36,
      apiKey,
    )

    return {
      content: limitText(reply, 24),
    }
  }

  const userMessage = limitText(event.userMessage, 280)
  const messageFromContext = sanitizeMessages(event.messages)
    .reverse()
    .find((item) => item.role === 'user')?.content
  const finalUserMessage = userMessage || messageFromContext

  if (!finalUserMessage) {
    throw new Error('chatReply requires userMessage or messages context.')
  }

  const historyRecord = await loadUserChatHistoryRecord(OPENID)
  const contextHistorySeed = sanitizeMessages(event.messages).map((item) => ({
    role: item.role,
    content: item.content,
    createdAt: new Date().toISOString(),
  }))
  const baseHistory = historyRecord?.messages?.length ? historyRecord.messages : contextHistorySeed
  const lastBaseMessage = baseHistory[baseHistory.length - 1]
  const shouldAppendUserMessage = !(lastBaseMessage?.role === 'user' && lastBaseMessage?.content === finalUserMessage)
  const nextHistory = [
    ...baseHistory,
    ...(shouldAppendUserMessage
      ? [
          {
            role: 'user',
            content: finalUserMessage,
            createdAt: new Date().toISOString(),
          },
        ]
      : []),
  ].slice(-MAX_HISTORY_MESSAGES)

  const chatMessages = nextHistory.slice(-MAX_CHAT_MESSAGES).map((item) => ({
    role: item.role,
    content: item.content,
  }))
  const reply = await requestQwenReply(
    [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...chatMessages,
    ],
    80,
    apiKey,
  )

  const savedHistory = await saveUserChatHistory(OPENID, [
    ...nextHistory,
    {
      role: 'assistant',
      content: limitText(reply, 60),
      createdAt: new Date().toISOString(),
    },
  ])

  return {
    content: limitText(reply, 60),
    history: savedHistory,
  }
}
