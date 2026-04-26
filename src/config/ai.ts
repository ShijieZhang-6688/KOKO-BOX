export const QWEN_API_BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const QWEN_MODEL = 'qwen-plus'

// Prototype key for direct mini-program testing. Move this behind a cloud function before production.
export const QWEN_API_KEY = 'sk-f20380c01f594f23b39570d2d6ec75ea'

export const isQwenConfigured = () => QWEN_API_KEY.trim().length > 0
