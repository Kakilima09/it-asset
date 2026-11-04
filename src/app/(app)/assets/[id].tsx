import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Loading } from '@/components/ui/loading'
import { PageHeader } from '@/components/ui/page-header'
import { Screen } from '@/components/ui/screen'
import { SyncStatusBanner } from '@/components/sync-status'
import { api } from '@/lib/api-client'
import { formatCurrency, formatDate, humanizeKey } from '@/lib/format'
import { colors, deviceTypeLabels, spacing, statusLabels, statusTone } from '@/lib/theme'
import type { AssetDetail } from '@/lib/types'

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="caption" style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  )
}

function specificationEntries(asset: AssetDetail) {
  if (!asset.specification) return []
  return Object.entries(asset.specification)
    .filter(([key, value]) => !['id', 'assetId', 'updatedAt', 'extra'].includes(key) && value !== null && value !== undefined && value !== '')
    .map(([key, value]) => ({
      key,
      label: humanizeKey(key),
      value: typeof value === 'boolean' ? (value ? 'Ya' : 'Tidak') : String(value),
    }))
}

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => api.asset(id),
    enabled: Boolean(id),
  })

  const asset = data?.asset
  const specs = asset ? specificationEntries(asset) : []

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <PageHeader
        onBack={() => router.back()}
        title={asset?.assetTag ?? 'Detail aset'}
        subtitle={asset ? `${deviceTypeLabels[asset.deviceType] ?? asset.deviceType} · ${asset.brand} ${asset.model}` : 'Memuat aset…'}
      />

      <SyncStatusBanner />

      {isLoading ? <Loading /> : null}

      {isError ? (
        <EmptyState
          title="Aset tidak dapat dimuat"
          message={error instanceof Error ? error.message : 'Periksa koneksi ke server.'}
          icon="cloud-offline-outline"
          actionLabel="Coba lagi"
          onAction={refetch}
        />
      ) : null}

      {asset ? (
        <>
          <View style={styles.badgeRow}>
            <Badge
              label={statusLabels[asset.lifecycleStatus] ?? asset.lifecycleStatus}
              tone={statusTone[asset.lifecycleStatus] ?? 'neutral'}
            />
            <Badge
              label={statusLabels[asset.conditionStatus] ?? asset.conditionStatus}
              tone={statusTone[asset.conditionStatus] ?? 'neutral'}
            />
          </View>

          <Card style={styles.card}>
            <AppText variant="subtitle">Penanggung jawab</AppText>
            {asset.user ? (
              <>
                <InfoRow icon="person-outline" label="Pengguna" value={asset.user.name} />
                {asset.user.email ? <InfoRow icon="mail-outline" label="Email" value={asset.user.email} /> : null}
                {asset.user.phone ? <InfoRow icon="call-outline" label="Telepon" value={asset.user.phone} /> : null}
              </>
            ) : (
              <AppText variant="caption">Belum ada pengguna yang ditugaskan.</AppText>
            )}
            {asset.company ? <InfoRow icon="business-outline" label="Perusahaan" value={asset.company.name} /> : null}
            {asset.division ? <InfoRow icon="git-branch-outline" label="Divisi" value={asset.division.name} /> : null}
            {asset.location ? (
              <InfoRow
                icon="location-outline"
                label="Lokasi"
                value={[asset.location.name, asset.location.building, asset.location.floor, asset.location.room].filter(Boolean).join(' · ')}
              />
            ) : null}
          </Card>

          <Card style={styles.card}>
            <AppText variant="subtitle">Detail perangkat</AppText>
            <InfoRow icon="pricetag-outline" label="Tag aset" value={asset.assetTag} />
            {asset.barcodeId ? <InfoRow icon="barcode-outline" label="Barcode" value={asset.barcodeId} /> : null}
            {asset.serialNumber ? <InfoRow icon="key-outline" label="Serial" value={asset.serialNumber} /> : null}
            <InfoRow icon="hardware-chip-outline" label="Jenis" value={deviceTypeLabels[asset.deviceType] ?? asset.deviceType} />
            {asset.purchaseDate ? <InfoRow icon="calendar-outline" label="Tanggal beli" value={formatDate(asset.purchaseDate)} /> : null}
            {asset.purchasePrice ? <InfoRow icon="cash-outline" label="Harga beli" value={formatCurrency(asset.purchasePrice)} /> : null}
            {asset.notes ? <InfoRow icon="document-text-outline" label="Catatan" value={asset.notes} /> : null}
          </Card>

          {specs.length ? (
            <Card style={styles.card}>
              <AppText variant="subtitle">Spesifikasi</AppText>
              {specs.map((entry) => (
                <InfoRow key={entry.key} icon="options-outline" label={entry.label} value={entry.value} />
              ))}
            </Card>
          ) : null}

          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <AppText variant="subtitle">Pekerjaan maintenance</AppText>
              <AppText variant="caption">{asset.maintenanceJobs?.length ?? 0} terbaru</AppText>
            </View>
            {asset.maintenanceJobs?.length ? (
              asset.maintenanceJobs.map((job) => (
                <Pressable
                  key={job.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/maintenance/[id]', params: { id: job.id } })}
                  style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}>
                  <View style={styles.listText}>
                    <AppText style={styles.listTitle}>{job.jobNumber}</AppText>
                    <AppText variant="caption">Jadwal {formatDate(job.scheduledDate)}</AppText>
                  </View>
                  <Badge label={statusLabels[job.status] ?? job.status} tone={statusTone[job.status] ?? 'neutral'} />
                  <Ionicons name="chevron-forward" size={16} color={colors.textSoft} />
                </Pressable>
              ))
            ) : (
              <AppText variant="caption">Belum ada pekerjaan maintenance.</AppText>
            )}
          </Card>

          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <AppText variant="subtitle">Insiden</AppText>
              <AppText variant="caption">{asset.incidents?.length ?? 0} terbaru</AppText>
            </View>
            {asset.incidents?.length ? (
              asset.incidents.map((incident) => (
                <Pressable
                  key={incident.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/incidents/[id]', params: { id: incident.id } })}
                  style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}>
                  <View style={styles.listText}>
                    <AppText style={styles.listTitle}>{incident.incidentNumber}</AppText>
                    <AppText variant="caption">{incident.category} · {formatDate(incident.createdAt)}</AppText>
                  </View>
                  <Badge label={statusLabels[incident.status] ?? incident.status} tone={statusTone[incident.status] ?? 'neutral'} />
                  <Ionicons name="chevron-forward" size={16} color={colors.textSoft} />
                </Pressable>
              ))
            ) : (
              <AppText variant="caption">Tidak ada insiden untuk aset ini.</AppText>
            )}
          </Card>

          <Button
            title="Laporkan masalah"
            variant="secondary"
            icon={<Ionicons name="alert-circle-outline" size={18} color={colors.primaryDark} />}
            onPress={() =>
              router.push({
                pathname: '/incidents/new',
                params: { assetId: asset.id, assetLabel: `${asset.assetTag} · ${asset.brand} ${asset.model}` },
              })
            }
          />
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  card: { gap: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoLabel: { width: 108 },
  infoValue: { flex: 1, fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  listText: { flex: 1, gap: 2 },
  listTitle: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
})
