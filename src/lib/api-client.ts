import { API_URL } from './config'
import { clearTokens, getStoredTokens, saveTokens } from './storage'
import type {
  AssetDetailResponse,
  AssetListParams,
  AssetListResponse,
  AssetLookupResponse,
  CreateIncidentInput,
  CreateIncidentResponse,
  DashboardOverview,
  IncidentDetailResponse,
  IncidentListParams,
  IncidentListResponse,
  IncidentStats,
  LoginResponse,
  MaintenanceJobDetailResponse,
  MaintenanceJobListResponse,
  MeResponse,
  SyncMutation,
  SyncPullResponse,
  SyncPushResponse,
  TokenPair,
} from './types'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

let tokens: TokenPair | null = null
let refreshPromise: Promise<TokenPair> | null = null
let sessionExpiredHandler: (() => void) | null = null

export function setApiTokens(next: TokenPair | null) {
  tokens = next
}

export function getApiTokens(): TokenPair | null {
  return tokens
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler
}

function buildQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

async function parseError(response: Response): Promise<ApiError> {
  let message = `Permintaan gagal (${response.status})`
  let details: unknown
  try {
    const body = await response.json()
    if (body && typeof body.error === 'string') message = body.error
    details = body?.details
  } catch {
    // keep default message
  }
  return new ApiError(response.status, message, details)
}

async function refreshTokens(): Promise<TokenPair> {
  if (!tokens?.refreshToken) throw new ApiError(401, 'Sesi berakhir')
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens?.refreshToken }),
      })
      if (!response.ok) throw await parseError(response)
      const data = (await response.json()) as { tokens: TokenPair }
      tokens = data.tokens
      await saveTokens(data.tokens)
      return data.tokens
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function request<T>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers })
  } catch {
    throw new ApiError(0, 'Tidak dapat terhubung ke server. Periksa koneksi dan URL API.')
  }

  if (response.status === 401 && canRetry && tokens?.refreshToken && !path.startsWith('/auth/')) {
    try {
      await refreshTokens()
      return request<T>(path, init, false)
    } catch (error) {
      await clearTokens()
      tokens = null
      sessionExpiredHandler?.()
      if (error instanceof ApiError) throw error
      throw new ApiError(401, 'Sesi berakhir. Silakan masuk kembali.')
    }
  }

  if (!response.ok) {
    const error = await parseError(response)
    if (response.status === 401 && !path.startsWith('/auth/')) {
      await clearTokens()
      tokens = null
      sessionExpiredHandler?.()
    }
    throw error
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function restoreApiTokens(tokenPair: TokenPair) {
  tokens = tokenPair
}

export async function hydrateTokensFromStorage(): Promise<TokenPair | null> {
  const stored = await getStoredTokens()
  if (stored) tokens = stored
  return stored
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
    false
  )
}

export async function refresh(): Promise<TokenPair> {
  return refreshTokens()
}

export const api = {
  me: () => request<MeResponse>('/auth/me'),
  dashboard: (params?: { companyId?: string; divisionId?: string; deviceType?: string }) =>
    request<DashboardOverview>(`/dashboard${buildQuery(params)}`),
  assets: (params?: AssetListParams) =>
    request<AssetListResponse>(
      `/assets${buildQuery({
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        deviceType: params?.deviceType,
        lifecycleStatus: params?.lifecycleStatus,
        conditionStatus: params?.conditionStatus,
        companyId: params?.companyId,
        divisionId: params?.divisionId,
        locationId: params?.locationId,
      })}`
    ),
  asset: (id: string) => request<AssetDetailResponse>(`/assets/${id}`),
  assetLookup: (identifier: string) =>
    request<AssetLookupResponse>(`/assets/lookup${buildQuery({ identifier })}`),
  maintenanceJobs: (params?: { page?: number; search?: string; status?: string }) =>
    request<MaintenanceJobListResponse>(
      `/maintenance-jobs${buildQuery({
        page: params?.page,
        search: params?.search,
        status: params?.status,
      })}`
    ),
  maintenanceJob: (id: string) => request<MaintenanceJobDetailResponse>(`/maintenance-jobs/${id}`),
  incidents: (params?: IncidentListParams) =>
    request<IncidentListResponse>(
      `/incidents${buildQuery({
        page: params?.page,
        search: params?.search,
        status: params?.status,
        priority: params?.priority,
        assetId: params?.assetId,
        assignedToId: params?.assignedToId,
      })}`
    ),
  incident: (id: string) => request<IncidentDetailResponse>(`/incidents/${id}`),
  createIncident: (data: CreateIncidentInput) =>
    request<CreateIncidentResponse>('/incidents', { method: 'POST', body: JSON.stringify(data) }),
  incidentStats: () => request<IncidentStats>('/incidents/stats'),
  syncPull: (cursor?: string, limit = 200) =>
    request<SyncPullResponse>(`/sync/pull${buildQuery({ cursor, limit })}`),
  syncPush: (mutations: SyncMutation[]) =>
    request<SyncPushResponse>('/sync/push', {
      method: 'POST',
      body: JSON.stringify({ mutations }),
    }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }, false),
}
