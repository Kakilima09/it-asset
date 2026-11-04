import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { Screen } from '@/components/ui/screen'
import { SyncStatusBanner } from '@/components/sync-status'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { formatNumber, formatPercent, initials } from '@/lib/format'
import { colors, deviceTypeLabels, radius, roleLabels, spacing } from '@/lib/theme'

type Tone = 'primary' | 'danger' | 'warning' | 'success'

const toneColors: Record<Tone, { background: string; foreground: string }> = {
  primary: { background: colors.primarySoft, foreground: colors.primaryDark },
  danger: { background: colors.dangerSoft, foreground: colors.danger },
  warning: { background: colors.warningSoft, foreground: colors.warning },
  success: { background: colors.successSoft, foreground: colors.success },
}

function StatCard({ label, value, icon, tone }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; tone: Tone }) {
  const palette = toneColors[tone]
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: palette.background }]}>
        <Ionicons name={icon} size={18} color={palette.foreground} />
      </View>
      <AppText variant="heading">{formatNumber(value)}</AppText>
      <AppText variant="caption" style={styles.statLabel}>{label}</AppText>
    </Card>
  )
}

export default function DashboardScreen() {
  const { user } = useAuth()
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.dashboard(),
  })

  const firstName = user?.name?.split(' ')[0] ?? 'Pengguna'

  if (!data) {
    if (isLoading) {
      return (
        <Screen>
          <Loading />
        </Screen>
      )
    }
    return (
      <Screen refreshing={isRefetching} onRefresh={refetch}>
        <EmptyState
          title="Dashboard gagal dimuat"
          message={isError && error instanceof Error ? error.message : 'Periksa koneksi ke server.'}
          icon="cloud-offline-outline"
          actionLabel="Coba lagi"
          onAction={refetch}
        />
      </Screen>
    )
  }

  const maxTrend = Math.max(1, ...data.trend.map((point) => point.count))
  const deviceEntries = Object.entries(data.byType)
  const maxDevice = Math.max(1, ...deviceEntries.map(([, count]) => count))

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="title">Halo, {firstName}</AppText>
          <View style={styles.roleRow}>
            <Badge label={roleLabels[user?.role ?? ''] ?? 'Pengguna'} tone="info" />
            <AppText variant="caption">Ringkasan hari ini</AppText>
          </View>
        </View>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{initials(user?.name)}</AppText>
        </View>
      </View>

      <SyncStatusBanner />

      <View style={styles.grid}>
        <StatCard label="Total aset" value={data.totalAssets} icon="cube-outline" tone="primary" />
        <StatCard label="Jadwal maintenance" value={data.maintenanceDue} icon="calendar-outline" tone="warning" />
        <StatCard label="Maintenance terlambat" value={data.overdueMaintenance} icon="alert-circle-outline" tone="danger" />
        <StatCard label="Insiden terbuka" value={data.openIncidents} icon="warning-outline" tone="danger" />
      </View>

      <Card style={styles.actions}>
        <AppText variant="subtitle">Aksi cepat</AppText>
        <View style={styles.actionRow}>
          <View style={styles.actionButton}>
            <Button
              title="Insiden"
              variant="secondary"
              onPress={() => router.push('/incidents')}
              icon={<Ionicons name="warning-outline" size={18} color={colors.primaryDark} />}
            />
          </View>
          <View style={styles.actionButton}>
            <Button
              title="Laporkan"
              onPress={() => router.push('/incidents/new')}
              icon={<Ionicons name="add-circle-outline" size={18} color="#ffffff" />}
            />
          </View>
        </View>
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <AppText variant="subtitle">Penyelesaian pekerjaan</AppText>
          <AppText variant="subtitle" style={{ color: colors.primary }}>{formatPercent(data.completionRate)}</AppText>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.min(100, data.completionRate)}%` }]} />
        </View>
        <View style={styles.sectionMeta}>
          <AppText variant="caption">Aset belum pernah diinspeksi: {formatNumber(data.assetsNeverInspected)}</AppText>
          <AppText variant="caption">Insiden kritis: {formatNumber(data.criticalIncidents)}</AppText>
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Aset per jenis</AppText>
        {deviceEntries.length ? (
          deviceEntries.map(([type, count]) => (
            <View key={type} style={styles.deviceRow}>
              <AppText variant="caption" style={styles.deviceLabel}>{deviceTypeLabels[type] ?? type}</AppText>
              <View style={styles.deviceBarTrack}>
                <View style={[styles.deviceBarFill, { width: `${Math.max(4, (count / maxDevice) * 100)}%` }]} />
              </View>
              <AppText variant="caption" style={styles.deviceCount}>{formatNumber(count)}</AppText>
            </View>
          ))
        ) : (
          <AppText variant="caption">Belum ada data aset.</AppText>
        )}
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Tren maintenance selesai</AppText>
        <View style={styles.chart}>
          {data.trend.map((point) => (
            <View key={point.key} style={styles.chartColumn}>
              <AppText variant="caption" style={styles.chartValue}>{point.count}</AppText>
              <View style={styles.chartTrack}>
                <View style={[styles.chartBar, { height: Math.max(4, (point.count / maxTrend) * 72) }]} />
              </View>
              <AppText variant="caption" style={styles.chartLabel}>{point.label}</AppText>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.section}>
        <AppText variant="subtitle">Kerusakan berulang</AppText>
        {data.recurringFailures.length ? (
          data.recurringFailures.map((item) => (
            <View key={item.category} style={styles.failureRow}>
              <AppText variant="body" style={styles.failureLabel}>{item.category}</AppText>
              <Badge label={`${item.count}x`} tone="warning" />
            </View>
          ))
        ) : (
          <AppText variant="caption">Tidak ada kerusakan berulang dalam 6 bulan terakhir.</AppText>
        )}
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerText: { gap: spacing.xs, flex: 1 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  statLabel: { fontSize: 12 },
  actions: { gap: spacing.md },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTrack: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },
  sectionMeta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deviceLabel: { width: 70, color: colors.text },
  deviceBarTrack: { flex: 1, height: 8, backgroundColor: '#e2e8f0', borderRadius: radius.pill, overflow: 'hidden' },
  deviceBarFill: { height: '100%', backgroundColor: colors.info, borderRadius: radius.pill },
  deviceCount: { width: 42, textAlign: 'right', color: colors.text },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.xs, paddingTop: spacing.sm },
  chartColumn: { flex: 1, alignItems: 'center', gap: spacing.xs },
  chartValue: { fontSize: 11 },
  chartTrack: { height: 72, width: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  chartBar: { width: '70%', backgroundColor: colors.primary, borderRadius: radius.sm },
  chartLabel: { fontSize: 10 },
  failureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  failureLabel: { flex: 1 },
})
