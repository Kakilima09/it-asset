import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { Screen } from '@/components/ui/screen'
import { SyncStatusBanner } from '@/components/sync-status'
import { api } from '@/lib/api-client'
import { formatDate, formatNumber } from '@/lib/format'
import { colors, deviceTypeLabels, spacing, statusLabels, statusTone } from '@/lib/theme'

export default function MaintenanceScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['maintenance-jobs'],
    queryFn: () => api.maintenanceJobs({ page: 1 }),
  })

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.header}>
        <AppText variant="title">Pekerjaan</AppText>
        <AppText variant="caption">
          {data ? `${formatNumber(data.total)} pekerjaan maintenance` : 'Memuat pekerjaan…'}
        </AppText>
      </View>

      <SyncStatusBanner />

      {isLoading ? <Loading /> : null}

      {isError ? (
        <EmptyState
          title="Gagal memuat pekerjaan"
          message={error instanceof Error ? error.message : 'Periksa koneksi ke server.'}
          icon="cloud-offline-outline"
          actionLabel="Coba lagi"
          onAction={refetch}
        />
      ) : null}

      {data && !data.jobs.length ? (
        <EmptyState title="Belum ada pekerjaan" message="Pekerjaan maintenance akan tampil di sini." icon="construct-outline" />
      ) : null}

      {data?.jobs.map((job) => (
        <Pressable
          key={job.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/maintenance/[id]', params: { id: job.id } })}
          style={({ pressed }) => [pressed ? styles.pressed : null]}>
          <Card style={styles.jobCard}>
            <View style={styles.rowBetween}>
              <AppText variant="mono" style={styles.jobNumber}>{job.jobNumber}</AppText>
              <Badge
                label={statusLabels[job.status] ?? job.status}
                tone={statusTone[job.status] ?? 'neutral'}
              />
            </View>
            <AppText variant="subtitle">{job.asset.brand} {job.asset.model}</AppText>
            <AppText variant="caption">
              {deviceTypeLabels[job.asset.deviceType] ?? job.asset.deviceType} · {job.asset.assetTag}
            </AppText>
            <View style={styles.meta}>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption">Jadwal {formatDate(job.scheduledDate)}</AppText>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption">{job.technician?.name ?? 'Belum ditugaskan'}</AppText>
              </View>
              {job.checklistTemplate ? (
                <View style={styles.metaRow}>
                  <Ionicons name="list-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption">{job.checklistTemplate.name}</AppText>
                </View>
              ) : null}
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  jobCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  jobNumber: { fontWeight: '700' },
  meta: { gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.75 },
})
