export type Role = 'SUPER_ADMIN' | 'IT_ADMIN' | 'IT_TECHNICIAN' | 'IT_MANAGER' | 'EMPLOYEE'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: Role
  companyId: string | null
  divisionId: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export interface LoginResponse {
  user: AuthUser
  tokens: TokenPair
}

export interface MeResponse {
  user: AuthUser
}

export interface TrendPoint {
  label: string
  count: number
  key: string
}

export interface DashboardOverview {
  totalAssets: number
  byType: Record<string, number>
  byCondition: Record<string, number>
  maintenanceDue: number
  overdueMaintenance: number
  openIncidents: number
  criticalIncidents: number
  assetsNeverInspected: number
  completionRate: number
  activeUsers: number
  trend: TrendPoint[]
  recurringFailures: { category: string; count: number }[]
  companies: { id: string; name: string }[]
  divisions: { id: string; name: string }[]
  locations: { id: string; name: string }[]
}

export interface AssetSummary {
  id: string
  assetTag: string
  barcodeId: string | null
  deviceType: string
  brand: string
  model: string
  serialNumber: string | null
  lifecycleStatus: string
  conditionStatus: string
  createdAt: string
  user: { id: string; name: string } | null
  company: { id: string; name: string } | null
  division: { id: string; name: string } | null
  location: { id: string; name: string } | null
}

export interface AssetListResponse {
  assets: AssetSummary[]
  total: number
  totalPages: number
  currentPage: number
  limit: number
}

export interface AssetListParams {
  page?: number
  limit?: number
  search?: string
  deviceType?: string
  lifecycleStatus?: string
  conditionStatus?: string
  companyId?: string
  divisionId?: string
  locationId?: string
}

export interface IncidentStats {
  open: number
  assigned: number
  inProgress: number
  waitingParts: number
  resolved: number
  critical: number
  total: number
}

export interface MaintenanceJobSummary {
  id: string
  jobNumber: string
  status: string
  scheduledDate: string
  completedAt: string | null
  notes: string | null
  asset: { id: string; assetTag: string; brand: string; model: string; deviceType: string }
  technician: { id: string; name: string } | null
  checklistTemplate: { id: string; name: string } | null
  _count?: { results: number }
}

export interface MaintenanceJobListResponse {
  jobs: MaintenanceJobSummary[]
  total: number
  page: number
  totalPages: number
}

export interface SyncPullResponse {
  changes: {
    seq: string
    entity: string
    entityId: string
    operation: 'UPSERT' | 'DELETE'
    changedAt: string
  }[]
  cursor: string
  hasMore: boolean
}

export interface SyncMutation {
  id: string
  action: SyncMutationAction
  payload?: Record<string, unknown>
}

export type SyncMutationAction =
  | 'maintenance.start'
  | 'maintenance.results'
  | 'maintenance.complete'
  | 'maintenance.cancel'
  | 'asset.update'
  | 'incident.create'
  | 'incident.status'
  | 'incident.repair'
  | 'incident.update'
  | 'pm.start'
  | 'pm.save'
  | 'pm.complete'

export interface SyncPushResult {
  id: string
  ok: boolean
  status: number
  error?: string
  data?: unknown
  replayed?: boolean
}

export interface SyncPushResponse {
  results: SyncPushResult[]
}

export interface AssetUser {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  role?: Role | string | null
  division?: { id: string; name: string; code?: string | null } | null
  company?: { id: string; name: string; code?: string | null } | null
  location?: { id: string; name: string; code?: string | null } | null
}

export interface AssetDetail {
  id: string
  assetTag: string
  barcodeId: string | null
  serialNumber: string | null
  deviceType: string
  brand: string
  model: string
  lifecycleStatus: string
  conditionStatus: string
  purchaseDate?: string | null
  purchasePrice?: string | number | null
  notes?: string | null
  createdAt: string
  updatedAt?: string
  user: AssetUser | null
  company: { id: string; name: string; code?: string | null } | null
  division: { id: string; name: string; code?: string | null } | null
  location: { id: string; name: string; code?: string | null; building?: string | null; floor?: string | null; room?: string | null } | null
  specification?: Record<string, unknown> | null
  maintenanceJobs?: MaintenanceJobSummary[]
  incidents?: IncidentSummary[]
  assignmentHistory?: unknown[]
  pmInspections?: unknown[]
  attachments?: AttachmentSummary[]
  auditLogs?: unknown[]
}

export interface AssetLookupResponse {
  asset: AssetDetail
}

export interface AssetDetailResponse {
  asset: AssetDetail
}

export interface AttachmentSummary {
  id: string
  originalName: string
  mimeType: string
  size?: number
  createdAt: string
  url?: string
}

export interface ChecklistItemDetail {
  id: string
  orderIndex: number
  category: string
  description: string
  requiresValue: boolean
  valueUnit: string | null
  isRequired: boolean
}

export type ChecklistResult = 'GOOD' | 'NEEDS_ATTENTION' | 'FAILED' | 'NOT_APPLICABLE'

export interface MaintenanceResultDetail {
  id: string
  checklistItemId: string
  result: ChecklistResult
  notes: string | null
  value: string | null
  createdAt?: string
}

export interface MaintenanceJobDetail {
  id: string
  jobNumber: string
  status: string
  scheduledDate: string
  startedAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  asset: AssetDetail
  plan: { id: string; name: string; interval: string } | null
  checklistTemplate: { id: string; name: string; items: ChecklistItemDetail[] } | null
  technician: { id: string; name: string; email?: string } | null
  createdBy: { id: string; name: string } | null
  results: MaintenanceResultDetail[]
  incidents: { id: string; incidentNumber: string; status: string; priority: string }[]
  attachments: AttachmentSummary[]
}

export interface MaintenanceJobDetailResponse {
  job: MaintenanceJobDetail
}

export type IncidentPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface IncidentSummary {
  id: string
  incidentNumber: string
  category: string
  description: string
  priority: IncidentPriority | string
  status: string
  createdAt: string
  updatedAt?: string
  resolvedAt?: string | null
  closedAt?: string | null
  asset: { id: string; assetTag: string; deviceType: string; brand: string; model: string }
  reportedBy: { id: string; name: string } | null
  assignedTo: { id: string; name: string } | null
}

export interface IncidentListResponse {
  incidents: IncidentSummary[]
  total: number
  page: number
  totalPages: number
}

export interface IncidentListParams {
  page?: number
  search?: string
  status?: string
  priority?: string
  assetId?: string
  assignedToId?: string
}

export interface IncidentRepairAction {
  id: string
  description: string
  technicianId: string | null
  technicianName: string | null
  actionDate: string
  notes: string | null
}

export interface IncidentStatusHistoryEntry {
  id: string
  fromStatus: string | null
  toStatus: string
  notes: string | null
  changedByName: string | null
  createdAt: string
}

export interface IncidentDetail extends IncidentSummary {
  maintenanceJob: { id: string; jobNumber: string } | null
  rootCause: string | null
  troubleshootingNotes: string | null
  resolutionNotes: string | null
  spareParts: string | null
  repairCost: string | number | null
  asset: AssetDetail
  repairActions: IncidentRepairAction[]
  statusHistory: IncidentStatusHistoryEntry[]
  attachments: AttachmentSummary[]
}

export interface IncidentDetailResponse {
  incident: IncidentDetail
}

export interface CreateIncidentInput {
  assetId: string
  maintenanceJobId?: string
  category: string
  description: string
  priority: IncidentPriority
}

export interface CreateIncidentResponse {
  success?: boolean
  incident: IncidentSummary
}
