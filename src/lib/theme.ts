export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primarySoft: '#dbeafe',
  background: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  textMuted: '#64748b',
  textSoft: '#94a3b8',
  border: '#e2e8f0',
  success: '#16a34a',
  successSoft: '#dcfce7',
  warning: '#d97706',
  warningSoft: '#fef3c7',
  danger: '#dc2626',
  dangerSoft: '#fee2e2',
  info: '#0891b2',
  infoSoft: '#cffafe',
  overlay: 'rgba(15, 23, 42, 0.45)',
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const

export const statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  RETIRED: 'danger',
  LOST: 'danger',
  IN_REPAIR: 'warning',
  GOOD: 'success',
  NEEDS_REPAIR: 'warning',
  DAMAGED: 'danger',
  SCHEDULED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
  OPEN: 'danger',
  ASSIGNED: 'info',
  WAITING_FOR_PARTS: 'warning',
  RESOLVED: 'success',
  CLOSED: 'neutral',
}

export const priorityTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
}

export const priorityLabels: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  CRITICAL: 'Kritis',
}

export const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  IT_ADMIN: 'IT Admin',
  IT_TECHNICIAN: 'Teknisi IT',
  IT_MANAGER: 'IT Manager',
  EMPLOYEE: 'Karyawan',
}

export const deviceTypeLabels: Record<string, string> = {
  LAPTOP: 'Laptop',
  DESKTOP: 'Desktop',
  MONITOR: 'Monitor',
  PRINTER: 'Printer',
}

export const statusLabels: Record<string, string> = {
  ACTIVE: 'Aktif',
  INACTIVE: 'Tidak Aktif',
  RETIRED: 'Pensiun',
  LOST: 'Hilang',
  IN_REPAIR: 'Perbaikan',
  GOOD: 'Baik',
  NEEDS_REPAIR: 'Perlu Perbaikan',
  DAMAGED: 'Rusak',
  SCHEDULED: 'Terjadwal',
  IN_PROGRESS: 'Dikerjakan',
  COMPLETED: 'Selesai',
  OVERDUE: 'Terlambat',
  CANCELLED: 'Dibatalkan',
  OPEN: 'Terbuka',
  ASSIGNED: 'Ditugaskan',
  WAITING_FOR_PARTS: 'Menunggu Sparepart',
  RESOLVED: 'Terselesaikan',
  CLOSED: 'Ditutup',
}
