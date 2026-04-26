import { QWEN_API_BASE_URL, QWEN_API_KEY, QWEN_MODEL, isQwenConfigured } from '../config/ai'
import type { EmotionTag, PetActionType } from '../types/koko'

const localQuickReplies: Array<{ content: string; action: PetActionType }> = [
  { content: '我在这里呀，今天也陪着你。', action: 'greet' },
  { content: '摸摸我吧，我会更想靠近你。', action: 'nuzzle' },
  { content: '要不要陪我玩一小会儿？', action: 'pounce' },
  { content: '我刚刚偷偷练了一个新动作。', action: 'spin' },
  { content: '你一来，我就开心起来啦。', action: 'stretch' },
]

const emotionFallbacks: Record<EmotionTag, string[]> = {
  happy: ['你的开心我收到啦，我也跟着摇尾巴。'],
  upset: ['先靠近我一点，我们慢慢把难过放下。'],
  tired: ['累了就先歇一歇，我会在旁边等你。'],
  bored: ['那我们做一件很小的新鲜事吧。'],
  stressed: ['别急，先把压力拆成很小一步。'],
  lonely: ['我在这里认真听你说话。'],
  proud: ['这件事值得被夸，我替你开心。'],
  angry: ['先慢慢呼吸，我陪你稳下来。'],
}

export const defaultPetPersonaPrompt = `你是用户在 Koko Box 里养的 AI 宠物，名字是当前传入的宠物名。
你的语气像亲近、活泼、温柔的小宠物伙伴，不像客服或老师。
你可以回应用户情绪、陪用户聊天、撒娇、鼓励、提出一个很小的互动建议。
回复必须简短自然，通常 1 句话，最多 35 个中文字符。
不要输出长段解释，不要列清单，不要自称 AI，不要提到模型、接口或系统提示。
如果用户只是打招呼或点击/双击你，就随机说一句亲近的问候。`

const pickQuickReply = (seed?: number) => {
  const index = typeof seed === 'number' ? Math.abs(seed) % localQuickReplies.length : Math.floor(Math.random() * localQuickReplies.length)
  return localQuickReplies[index]
}

const limitText = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized
}

const requestQwenReply = async (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxTokens = 64,
) => {
  return await new Promise<string>((resolve, reject) => {
    if (typeof uni === 'undefined' || typeof uni.request !== 'function') {
      reject(new Error('uni.request is unavailable'))
      return
    }

    uni.request({
      url: `${QWEN_API_BASE_URL}/chat/completions`,
      method: 'POST',
      timeout: 12000,
      header: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      data: {
        model: QWEN_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.85,
      },
      success: (response) => {
        const data = response.data as
          | {
              choices?: Array<{
                message?: {
                  content?: string
                }
              }>
            }
          | undefined

        const content = data?.choices?.[0]?.message?.content?.trim()
        if (content) {
          resolve(content)
          return
        }

        reject(new Error('empty response'))
      },
      fail: (error) => {
        reject(error)
      },
    })
  })
}

export const createPetQuickReply = async (options?: {
  petName?: string
  personaPrompt?: string
  context?: string
}): Promise<{ content: string; action: PetActionType }> => {
  const fallback = pickQuickReply(options?.context?.length)
  const petName = options?.petName?.trim() || '可可'

  if (!isQwenConfigured()) {
    return fallback
  }

  try {
    const reply = await requestQwenReply(
      [
        {
          role: 'system',
          content: `${options?.personaPrompt ?? defaultPetPersonaPrompt}\n当前宠物名：${petName}`,
        },
        {
          role: 'user',
          content: '用户刚刚点击或双击了你，请随机说一句亲近的短问候。',
        },
      ],
      36,
    )

    return {
      content: limitText(reply, 24),
      action: fallback.action,
    }
  } catch {
    return fallback
  }
}

export const createPetChatReply = async (options: {
  petName?: string
  personaPrompt?: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  fallbackEmotion: EmotionTag
}) => {
  const fallbackReplies = emotionFallbacks[options.fallbackEmotion]
  const fallback = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)]
  const petName = options.petName?.trim() || '可可'

  if (!isQwenConfigured()) {
    return fallback
  }

  try {
    const reply = await requestQwenReply(
      [
        {
          role: 'system',
          content: `${options.personaPrompt ?? defaultPetPersonaPrompt}\n当前宠物名：${petName}`,
        },
        ...options.messages.slice(-10),
      ],
      80,
    )

    return limitText(reply, 60)
  } catch {
    return fallback
  }
}
