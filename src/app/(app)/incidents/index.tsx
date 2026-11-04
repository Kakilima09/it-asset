import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useDeferredValue, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ChoiceChips, type ChoiceOption } from '@/components/ui/choice-chips'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { PageHeader } from '@/components/ui/page-header'
import { Screen } from '@/components/ui/screen'
import { SyncStatusBanner } from '@/components/sync-status'
import { api } from '@/lib/api-client'
import { formatDate, formatNumber } from '@/lib/format'
import { colors, spacing, statusLabels, statusTone } from '@/lib/theme'
import type { IncidentPriority } from '@/lib/types'

const STATUS_OPTIONS: ChoiceOption[] = [
  { value: '', label: 'Semua' },
  { value: 'OPEN', label: 'Terbuka' },
  { value: 'ASSIGNED', label: 'Ditugaskan' },
  { value: 'IN_PROGRESS', label: 'Dikerjakan' },
  { value: 'WAITING_FOR_PARTS', label: 'Menunggu Sparepart' },
  { value: 'RESOLVED', label: 'Terselesaikan' },
  { value: 'CLOSED', label: 'Ditutup' },
]

const PRIORITY_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  LOW: 'neutral',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'danger',
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  CRITICAL: 'Kritis',
}

export default function IncidentsScreen() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['incidents', { search: deferredSearch, status, page }],
    queryFn: () =>
      api.incidents({
        page,
        search: deferredSearch || undefined,
        status: status || undefined,
      }),
  })

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <PageHeader
        onBack={() => router.back()}
        title="Insiden"
        subtitle={data ? `${formatNumber(data.total)} laporan` : 'Memuat insiden…'}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Laporkan insiden"
            onPress={() => router.push('/incidents/new')}
            style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </Pressable>
        }
      />

      <SyncStatusBanner />

      <Input
        value={search}
        onChangeText={(value) => {
          setSearch(value)
          setPage(1)
        }}
        placeholder="Cari nomor, kategori, aset, atau deskripsi"
        autoCapitalize="none"
        autoCorrect={false}
        rightAccessory={<Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />}
      />

      <ChoiceChips
        options={STATUS_OPTIONS}
        value={status}
        onChange={(value) => {
          setStatus(value)
          setPage(1)
        }}
      />

      {isLoading ? <Loading /> : null}

      {isError ? (
        <EmptyState
          title="Gagal memuat insiden"
          message={error instanceof Error ? error.message : 'Periksa koneksi ke server.'}
          icon="cloud-offline-outline"
          actionLabel="Coba lagi"
          onAction={refetch}
        />
      ) : null}

      {data && !data.incidents.length ? (
        <EmptyState
          title="Tidak ada insiden"
          message={search || status ? 'Tidak ada laporan yang cocok dengan filter.' : 'Belum ada insiden yang dilaporkan.'}
          icon="shield-checkmark-outline"
        />
      ) : null}

      {data?.incidents.map((incident) => (
        <Pressable
          key={incident.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/incidents/[id]', params: { id: incident.id } })}
          style={({ pressed }) => [pressed ? styles.pressed : null]}>
          <Card style={styles.incidentCard}>
            <View style={styles.rowBetween}>
              <AppText variant="mono" style={styles.number}>{incident.incidentNumber}</AppText>
              <Badge label={statusLabels[incident.status] ?? incident.status} tone={statusTone[incident.status] ?? 'neutral'} />
            </View>
            <AppText variant="subtitle" style={styles.category}>{incident.category}</AppText>
            <AppText variant="caption" numberOfLines={2}>{incident.description}</AppText>
            <View style={styles.meta}>
              <View style={styles.metaRow}>
                <Ionicons name="cube-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption" style={styles.metaText}>{incident.asset.assetTag} · {incident.asset.brand} {incident.asset.model}</AppText>
              </View>
              <View style={styles.metaRow}>
                <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                <AppText variant="caption" style={styles.metaText}>
                  {incident.assignedTo?.name ?? incident.reportedBy?.name ?? '—'}
                </AppText>
              </View>
            </View>
            <View style={styles.rowBetween}>
              <Badge
                label={`Prioritas ${PRIORITY_LABELS[incident.priority as IncidentPriority] ?? incident.priority}`}
                tone={PRIORITY_TONE[incident.priority] ?? 'neutral'}
              />
              <AppText variant="caption">{formatDate(incident.createdAt)}</AppText>
            </View>
          </Card>
        </Pressable>
      ))}

      {data && data.totalPages > 1 ? (
        <View style={styles.pagination}>
          <Button
            title="Sebelumnya"
            variant="ghost"
            disabled={page <= 1}
            onPress={() => setPage((value) => Math.max(1, value - 1))}
            style={styles.pageButton}
          />
          <AppText variant="caption">Halaman {data.page} dari {data.totalPages}</AppText>
          <Button
            title="Berikutnya"
            variant="ghost"
            disabled={page >= data.totalPages}
            onPress={() => setPage((value) => value + 1)}
            style={styles.pageButton}
          />
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  searchIcon: { paddingRight: spacing.xs },
  incidentCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  number: { fontWeight: '700' },
  category: { fontSize: 15 },
  meta: { gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  metaText: { flex: 1 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  pageButton: { minHeight: 40, flex: 1 },
})
