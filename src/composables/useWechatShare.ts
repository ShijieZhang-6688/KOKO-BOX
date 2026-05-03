import { onLoad, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'

type ShareOptions = {
  path: string | (() => string)
  title?: string | (() => string)
  imageUrl?: string | (() => string)
  query?: Record<string, string | number | boolean | undefined> | (() => Record<string, string | number | boolean | undefined>)
}

const DEFAULT_TITLE = 'Koko Box - A gentle companion mini program'
const DEFAULT_IMAGE = '/static/tab/tab-rest-active.png'

const resolveValue = <T>(value: T | (() => T)) => (typeof value === 'function' ? (value as () => T)() : value)

const buildQueryString = (query?: Record<string, string | number | boolean | undefined>) => {
  if (!query) {
    return ''
  }

  const params = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)

  return params.length > 0 ? `?${params.join('&')}` : ''
}

export const useWechatShare = (options: ShareOptions) => {
  const createSharePayload = () => {
    const path = resolveValue(options.path)
    const title = options.title ? resolveValue(options.title) : DEFAULT_TITLE
    const imageUrl = options.imageUrl ? resolveValue(options.imageUrl) : DEFAULT_IMAGE
    const query = options.query ? resolveValue(options.query) : undefined
    const sharePath = `${path}${buildQueryString(query)}`

    return {
      title,
      path: sharePath,
      imageUrl,
    }
  }

  onLoad(() => {
    // #ifdef MP-WEIXIN
    uni.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    // #endif
  })

  onShow(() => {
    // #ifdef MP-WEIXIN
    uni.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    // #endif
  })

  onShareAppMessage(() => createSharePayload())

  onShareTimeline(() => {
    const payload = createSharePayload()
    return {
      title: payload.title,
      query: payload.path.split('?')[1] || '',
      imageUrl: payload.imageUrl,
    }
  })
}
