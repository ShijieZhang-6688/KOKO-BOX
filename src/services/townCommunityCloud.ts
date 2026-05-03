import { isWechatCloudConfigured } from '../config/cloud'

export interface TownCommunityPartner {
  openid: string
  nickName: string
  avatarUrl: string
  petName: string
  x: number
  y: number
  action: string
  online: boolean
  isSelf: boolean
  lastSeenAt: string
}

export interface TownCommunityRoom {
  id: string
  ownerOpenid: string
  inviteCode: string
  inviteExpiresAt: string
  memberCount: number
  updatedAt: string
}

export interface TownCommunityState {
  room: TownCommunityRoom
  partners: TownCommunityPartner[]
  invitePath: string
  inviteCode: string
  qrCodeFileID?: string
}

export interface TownCommunityPresencePayload {
  nickName?: string
  avatarUrl?: string
  petName?: string
  x: number
  y: number
  action?: string
}

interface WechatCloudApi {
  callFunction?: (options: unknown) => Promise<{ result: unknown }>
}

const getWechatCloudApi = () =>
  (globalThis as { wx?: { cloud?: WechatCloudApi } }).wx?.cloud

const callTownCommunityFunction = async <T>(data: Record<string, unknown>, timeout = 20000) => {
  const wxCloud = getWechatCloudApi()

  if (!wxCloud?.callFunction || !isWechatCloudConfigured()) {
    throw new Error('Town community cloud is unavailable.')
  }

  const response = await wxCloud.callFunction({
    name: 'town-community',
    data,
    timeout,
  })

  return normalizeTownCommunityState(response.result) as T
}

const normalizeText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback

const normalizeNumber = (value: unknown, fallback: number) => {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const normalizePartner = (value: unknown, index: number): TownCommunityPartner => {
  const source = (value ?? {}) as Partial<TownCommunityPartner>
  return {
    openid: normalizeText(source.openid, `partner-${index}`),
    nickName: normalizeText(source.nickName, `Koko Friend ${index + 1}`),
    avatarUrl: normalizeText(source.avatarUrl),
    petName: normalizeText(source.petName, 'Koko'),
    x: normalizeNumber(source.x, 18 + index * 10),
    y: normalizeNumber(source.y, 72),
    action: normalizeText(source.action, 'idle'),
    online: Boolean(source.online),
    isSelf: Boolean(source.isSelf),
    lastSeenAt: normalizeText(source.lastSeenAt),
  }
}

const normalizeTownCommunityState = (value: unknown): TownCommunityState => {
  const source = (value ?? {}) as Partial<TownCommunityState>
  const room = (source.room ?? {}) as Partial<TownCommunityRoom>

  return {
    room: {
      id: normalizeText(room.id),
      ownerOpenid: normalizeText(room.ownerOpenid),
      inviteCode: normalizeText(room.inviteCode),
      inviteExpiresAt: normalizeText(room.inviteExpiresAt),
      memberCount: normalizeNumber(room.memberCount, 1),
      updatedAt: normalizeText(room.updatedAt),
    },
    partners: Array.isArray(source.partners)
      ? source.partners.map((item, index) => normalizePartner(item, index)).filter((item) => item.openid)
      : [],
    invitePath: normalizeText(source.invitePath),
    inviteCode: normalizeText(source.inviteCode),
    qrCodeFileID: normalizeText(source.qrCodeFileID),
  }
}

export const loadTownCommunityState = () =>
  callTownCommunityFunction<TownCommunityState>({ action: 'load' })

export const sendTownCommunityHeartbeat = (payload: TownCommunityPresencePayload) =>
  callTownCommunityFunction<TownCommunityState>({
    action: 'heartbeat',
    ...payload,
  })

export const markTownCommunityOffline = (payload: TownCommunityPresencePayload) =>
  callTownCommunityFunction<TownCommunityState>({
    action: 'offline',
    ...payload,
  })

export const createTownInvite = (payload: TownCommunityPresencePayload) =>
  callTownCommunityFunction<TownCommunityState>(
    {
      action: 'createInvite',
      ...payload,
    },
    30000,
  )

export const joinTownInvite = (inviteCode: string, payload: TownCommunityPresencePayload) =>
  callTownCommunityFunction<TownCommunityState>(
    {
      action: 'joinInvite',
      inviteCode,
      ...payload,
    },
    30000,
  )
