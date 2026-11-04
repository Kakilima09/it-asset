import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { PageHeader } from '@/components/ui/page-header'
import { Screen } from '@/components/ui/screen'
import { SyncStatusBanner } from '@/components/sync-status'
import { api } from '@/lib/api-client'
import { useAuth } from '@/lib/auth-context'
import { formatCurrency, formatDate } from '@/lib/format'
import { useSync, type SubmitResult } from '@/lib/sync-context'
import { colors, priorityLabels, priorityTone, radius, spacing, statusLabels, statusTone } from '@/lib/theme'
import type { IncidentDetail, IncidentDetailResponse } from '@/lib/types'

const NEXT_STATUS: Record<string, string[]> = {
  OPEN: ['ASSIGNED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN'],
  IN_PROGRESS: ['WAITING_FOR_PARTS', 'RESOLVED'],
  WAITING_FOR_PARTS: ['IN_PROGRESS'],
  RESOLVED: ['CLOSED'],
  CLOSED: [],
}

const UPDATER_ROLES = ['SUPER_ADMIN', 'IT_ADMIN', 'IT_TECHNICIAN']

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="caption" style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  )
}

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const { submit } = useSync()
  const queryClient = useQueryClient()
  const [rootCause, setRootCause] = useState('')
  const [troubleshooting, setTroubleshooting] = useState('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [spareParts, setSpareParts] = useState('')
  const [repairCost, setRepairCost] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [repairDescription, setRepairDescription] = useState('')
  const [repairNotes, setRepairNotes] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const initialized = useRef<string | null>(null)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => api.incident(id),
    enabled: Boolean(id),
  })

  const incident = data?.incident
  const canUpdate = incident ? UPDATER_ROLES.includes(user?.role ?? '') : false
  const nextStatuses = incident ? NEXT_STATUS[incident.status] ?? [] : []
  const canAddRepair = canUpdate && incident?.status === 'IN_PROGRESS'

  useEffect(() => {
    if (!incident || initialized.current === incident.id) return
    initialized.current = incident.id
    setRootCause(incident.rootCause ?? '')
    setTroubleshooting(incident.troubleshootingNotes ?? '')
    setResolutionNotes(incident.resolutionNotes ?? '')
    setSpareParts(incident.spareParts ?? '')
    setRepairCost(incident.repairCost !== null && incident.repairCost !== undefined ? String(incident.repairCost) : '')
  }, [incident])

  function patchIncident(updater: (current: IncidentDetail) => IncidentDetail) {
    queryClient.setQueryData<IncidentDetailResponse>(['incident', id], (current) =>
      current?.incident ? { incident: updater(current.incident) } : current
    )
  }

  async function saveDetails(showAlert = true): Promise<SubmitResult | null> {
    if (!incident) return null
    setBusy('details')
    const response = await submit('incident.update', {
      incidentId: incident.id,
      data: {
        rootCause: rootCause.trim() || undefined,
        troubleshootingNotes: troubleshooting.trim() || undefined,
        resolutionNotes: resolutionNotes.trim() || undefined,
        spareParts: spareParts.trim() || undefined,
        repairCost: repairCost.trim() || undefined,
      },
    })
    setBusy(null)
    if (!response.ok) {
      Alert.alert('Gagal menyimpan', response.error ?? 'Detail insiden tidak dapat disimpan.')
      return response
    }
    patchIncident((current) => ({
      ...current,
      rootCause: rootCause.trim() || null,
      troubleshootingNotes: troubleshooting.trim() || null,
      resolutionNotes: resolutionNotes.trim() || null,
      spareParts: spareParts.trim() || null,
      repairCost: repairCost.trim() || null,
    }))
    if (showAlert) {
      Alert.alert(
        response.queued ? 'Tersimpan offline' : 'Detail tersimpan',
        response.queued ? 'Perubahan akan dikirim saat perangkat kembali online.' : 'Detail insiden berhasil diperbarui.'
      )
    }
    return response
  }

  async function handleStatus(toStatus: string) {
    if (!incident) return
    if (toStatus === 'ASSIGNED' && !incident.assignedTo) {
      Alert.alert('Belum ada teknisi', 'Tetapkan teknisi terlebih dahulu sebelum mengubah status menjadi Ditugaskan.')
      return
    }
    if (toStatus === 'RESOLVED') {
      if (!resolutionNotes.trim()) {
        Alert.alert('Catatan penyelesaian wajib diisi', 'Isi catatan penyelesaian sebelum menyelesaikan insiden.')
        return
      }
      const saved = await saveDetails(false)
      if (!saved || !saved.ok) return
    }

    setBusy(`status-${toStatus}`)
    const response = await submit('incident.status', {
      incidentId: incident.id,
      toStatus,
      notes: statusNotes.trim() || undefined,
    })
    setBusy(null)
    if (!response.ok) {
      Alert.alert('Gagal mengubah status', response.error ?? 'Status insiden tidak dapat diubah.')
      return
    }
    patchIncident((current) => ({ ...current, status: toStatus }))
    setStatusNotes('')
    Alert.alert(
      response.queued ? 'Tersimpan offline' : 'Status diperbarui',
      response.queued ? 'Perubahan status akan dikirim saat online.' : `Status diubah menjadi ${statusLabels[toStatus] ?? toStatus}.`
    )
  }

  async function handleAddRepair() {
    if (!incident) return
    if (repairDescription.trim().length < 3) {
      Alert.alert('Deskripsi terlalu pendek', 'Tindakan perbaikan minimal 3 karakter.')
      return
    }
    setBusy('repair')
    const response = await submit('incident.repair', {
      incidentId: incident.id,
      data: {
        description: repairDescription.trim(),
        notes: repairNotes.trim() || undefined,
        actionDate: new Date().toISOString(),
      },
    })
    setBusy(null)
    if (!response.ok) {
      Alert.alert('Gagal menyimpan tindakan', response.error ?? 'Tindakan perbaikan tidak dapat disimpan.')
      return
    }
    patchIncident((current) => ({
      ...current,
      repairActions: [
        ...current.repairActions,
        {
          id: `local-${Date.now()}`,
          description: repairDescription.trim(),
          notes: repairNotes.trim() || null,
          technicianId: user?.id ?? null,
          technicianName: user?.name ?? null,
          actionDate: new Date().toISOString(),
        },
      ],
    }))
    setRepairDescription('')
    setRepairNotes('')
    Alert.alert(
      response.queued ? 'Tersimpan offline' : 'Tindakan tersimpan',
      response.queued ? 'Tindakan perbaikan akan dikirim saat online.' : 'Tindakan perbaikan berhasil dicatat.'
    )
  }

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <PageHeader
        onBack={() => router.back()}
        title={incident?.incidentNumber ?? 'Detail insiden'}
        subtitle={incident?.category ?? 'Memuat insiden…'}
      />

      <SyncStatusBanner />

      {isLoading ? <Loading /> : null}

      {isError ? (
        <EmptyState
          title="Insiden tidak dapat dimuat"
          message={error instanceof Error ? error.message : 'Periksa koneksi ke server.'}
          icon="cloud-offline-outline"
          actionLabel="Coba lagi"
          onAction={refetch}
        />
      ) : null}

      {incident ? (
        <>
          <View style={styles.badgeRow}>
            <Badge label={statusLabels[incident.status] ?? incident.status} tone={statusTone[incident.status] ?? 'neutral'} />
            <Badge label={`Prioritas ${priorityLabels[incident.priority] ?? incident.priority}`} tone={priorityTone[incident.priority] ?? 'neutral'} />
          </View>

          <Card style={styles.card}>
            <AppText variant="subtitle">Laporan</AppText>
            <AppText style={styles.description}>{incident.description}</AppText>
            <InfoRow icon="person-outline" label="Pelapor" value={incident.reportedBy?.name ?? '—'} />
            <InfoRow icon="hammer-outline" label="Teknisi" value={incident.assignedTo?.name ?? 'Belum ditugaskan'} />
            <InfoRow icon="calendar-outline" label="Dilaporkan" value={formatDate(incident.createdAt, true)} />
            {incident.resolvedAt ? <InfoRow icon="checkmark-done-outline" label="Selesai" value={formatDate(incident.resolvedAt, true)} /> : null}
            {incident.closedAt ? <InfoRow icon="lock-closed-outline" label="Ditutup" value={formatDate(incident.closedAt, true)} /> : null}
            {incident.maintenanceJob ? <InfoRow icon="construct-outline" label="Pekerjaan" value={incident.maintenanceJob.jobNumber} /> : null}
          </Card>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/assets/[id]', params: { id: incident.asset.id } })}
            style={({ pressed }) => [pressed ? styles.pressed : null]}>
            <Card style={styles.assetCard}>
              <View style={styles.assetIcon}>
                <Ionicons name="cube-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.assetText}>
                <AppText style={styles.assetTitle}>{incident.asset.assetTag}</AppText>
                <AppText variant="caption">{incident.asset.brand} {incident.asset.model}</AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
            </Card>
          </Pressable>

          <Card style={styles.card}>
            <AppText variant="subtitle">Penanganan</AppText>
            {canUpdate ? (
              <>
                <Input label="Akar masalah" value={rootCause} onChangeText={setRootCause} placeholder="Penyebab utama" editable={!busy} multiline />
                <Input label="Catatan troubleshooting" value={troubleshooting} onChangeText={setTroubleshooting} placeholder="Langkah pemeriksaan" editable={!busy} multiline />
                <Input label="Sparepart" value={spareParts} onChangeText={setSpareParts} placeholder="Komponen yang diganti" editable={!busy} />
                <Input
                  label="Biaya perbaikan (Rp)"
                  value={repairCost}
                  onChangeText={setRepairCost}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  editable={!busy}
                />
                <Input label="Catatan penyelesaian" value={resolutionNotes} onChangeText={setResolutionNotes} placeholder="Wajib saat menyelesaikan insiden" editable={!busy} multiline />
                <Button
                  title="Simpan penanganan"
                  variant="secondary"
                  loading={busy === 'details'}
                  disabled={Boolean(busy)}
                  onPress={() => void saveDetails()}
                />
              </>
            ) : (
              <>
                <InfoRow icon="search-outline" label="Akar masalah" value={incident.rootCause ?? '—'} />
                <InfoRow icon="construct-outline" label="Troubleshooting" value={incident.troubleshootingNotes ?? '—'} />
                <InfoRow icon="cube-outline" label="Sparepart" value={incident.spareParts ?? '—'} />
                <InfoRow icon="cash-outline" label="Biaya" value={formatCurrency(incident.repairCost)} />
                <InfoRow icon="checkmark-done-outline" label="Penyelesaian" value={incident.resolutionNotes ?? '—'} />
              </>
            )}
          </Card>

          {canUpdate && nextStatuses.length ? (
            <Card style={styles.card}>
              <AppText variant="subtitle">Ubah status</AppText>
              <Input
                label="Catatan perubahan (opsional)"
                value={statusNotes}
                onChangeText={setStatusNotes}
                placeholder="Alasan atau keterangan"
                editable={!busy}
                multiline
              />
              <View style={styles.statusButtons}>
                {nextStatuses.map((status) => (
                  <Button
                    key={status}
                    title={statusLabels[status] ?? status}
                    variant={status === 'CLOSED' || status === 'RESOLVED' ? 'secondary' : 'primary'}
                    loading={busy === `status-${status}`}
                    disabled={Boolean(busy)}
                    onPress={() => void handleStatus(status)}
                    style={styles.statusButton}
                  />
                ))}
              </View>
            </Card>
          ) : null}

          <Card style={styles.card}>
            <AppText variant="subtitle">Riwayat status</AppText>
            {incident.statusHistory.length ? (
              incident.statusHistory.map((entry) => (
                <View key={entry.id} style={styles.timelineRow}>
                  <View style={styles.timelineDot} />
                  <View style={styles.timelineText}>
                    <AppText style={styles.timelineTitle}>
                      {entry.fromStatus ? `${statusLabels[entry.fromStatus] ?? entry.fromStatus} → ` : ''}
                      {statusLabels[entry.toStatus] ?? entry.toStatus}
                    </AppText>
                    <AppText variant="caption">
                      {entry.changedByName ?? 'Sistem'} · {formatDate(entry.createdAt, true)}
                    </AppText>
                    {entry.notes ? <AppText variant="caption">{entry.notes}</AppText> : null}
                  </View>
                </View>
              ))
            ) : (
              <AppText variant="caption">Belum ada riwayat status.</AppText>
            )}
          </Card>

          <Card style={styles.card}>
            <AppText variant="subtitle">Tindakan perbaikan</AppText>
            {incident.repairActions.length ? (
              incident.repairActions.map((action) => (
                <View key={action.id} style={styles.repairRow}>
                  <AppText style={styles.repairTitle}>{action.description}</AppText>
                  <AppText variant="caption">
                    {action.technicianName ?? 'Teknisi'} · {formatDate(action.actionDate, true)}
                  </AppText>
                  {action.notes ? <AppText variant="caption">{action.notes}</AppText> : null}
                </View>
              ))
            ) : (
              <AppText variant="caption">Belum ada tindakan perbaikan yang dicatat.</AppText>
            )}

            {canAddRepair ? (
              <View style={styles.repairForm}>
                <Input
                  label="Tindakan baru"
                  value={repairDescription}
                  onChangeText={setRepairDescription}
                  placeholder="Contoh: Ganti RAM modul 1"
                  editable={!busy}
                  multiline
                />
                <Input
                  label="Catatan"
                  value={repairNotes}
                  onChangeText={setRepairNotes}
                  placeholder="Opsional"
                  editable={!busy}
                  multiline
                />
                <Button
                  title="Catat tindakan"
                  loading={busy === 'repair'}
                  disabled={Boolean(busy)}
                  onPress={() => void handleAddRepair()}
                />
              </View>
            ) : null}
          </Card>

          {incident.attachments.length ? (
            <Card style={styles.card}>
              <AppText variant="subtitle">Lampiran</AppText>
              {incident.attachments.map((attachment) => (
                <View key={attachment.id} style={styles.attachmentRow}>
                  <Ionicons name="document-attach-outline" size={18} color={colors.primary} />
                  <AppText style={styles.attachmentName}>{attachment.originalName}</AppText>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  card: { gap: spacing.sm },
  description: { fontSize: 15, lineHeight: 22 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoLabel: { width: 110 },
  infoValue: { flex: 1, fontSize: 14 },
  assetCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  assetIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetText: { flex: 1, gap: 2 },
  assetTitle: { fontWeight: '700' },
  pressed: { opacity: 0.7 },
  statusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statusButton: { flexGrow: 1 },
  timelineRow: { flexDirection: 'row', gap: spacing.sm },
  timelineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 5,
  },
  timelineText: { flex: 1, gap: 2 },
  timelineTitle: { fontSize: 13, fontWeight: '600' },
  repairRow: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  repairTitle: { fontSize: 14, fontWeight: '600' },
  repairForm: { gap: spacing.sm, marginTop: spacing.sm },
  attachmentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  attachmentName: { flex: 1, fontSize: 14 },
})
