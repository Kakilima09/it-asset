import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
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
import { formatDate, humanizeKey } from '@/lib/format'
import { useSync, type SubmitResult } from '@/lib/sync-context'
import { colors, deviceTypeLabels, radius, spacing, statusLabels, statusTone } from '@/lib/theme'
import type { ChecklistResult, MaintenanceJobDetail, MaintenanceJobDetailResponse } from '@/lib/types'

const RESULT_OPTIONS: ChoiceOption[] = [
  { value: 'GOOD', label: 'Baik' },
  { value: 'NEEDS_ATTENTION', label: 'Perlu Perhatian' },
  { value: 'FAILED', label: 'Gagal' },
  { value: 'NOT_APPLICABLE', label: 'Tidak Berlaku' },
]

const RESULT_TONE: Record<ChecklistResult, 'success' | 'warning' | 'danger' | 'neutral'> = {
  GOOD: 'success',
  NEEDS_ATTENTION: 'warning',
  FAILED: 'danger',
  NOT_APPLICABLE: 'neutral',
}

interface LocalResult {
  result?: ChecklistResult
  value: string
  notes: string
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <AppText variant="caption" style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  )
}

export default function MaintenanceJobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { submit } = useSync()
  const [localResults, setLocalResults] = useState<Record<string, LocalResult>>({})
  const [completionNotes, setCompletionNotes] = useState('')
  const [action, setAction] = useState<'start' | 'save' | 'complete' | 'cancel' | null>(null)
  const initialized = useRef<string | null>(null)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['maintenance-job', id],
    queryFn: () => api.maintenanceJob(id),
    enabled: Boolean(id),
  })

  const job = data?.job

  useEffect(() => {
    if (!job || initialized.current === job.id) return
    initialized.current = job.id
    const initial: Record<string, LocalResult> = {}
    for (const item of job.checklistTemplate?.items ?? []) {
      const saved = job.results.find((result) => result.checklistItemId === item.id)
      initial[item.id] = {
        result: saved?.result,
        value: saved?.value ?? '',
        notes: saved?.notes ?? '',
      }
    }
    setLocalResults(initial)
    setCompletionNotes(job.notes ?? '')
  }, [job])

  function patchJob(updater: (current: MaintenanceJobDetail) => MaintenanceJobDetail) {
    queryClient.setQueryData<MaintenanceJobDetailResponse>(['maintenance-job', id], (current) =>
      current?.job ? { job: updater(current.job) } : current
    )
  }

  function updateLocal(itemId: string, patch: Partial<LocalResult>) {
    setLocalResults((current) => ({
      ...current,
      [itemId]: { ...current[itemId], value: current[itemId]?.value ?? '', notes: current[itemId]?.notes ?? '', ...patch },
    }))
  }

  function collectResults() {
    if (!job?.checklistTemplate) return { payload: [], error: null as string | null }
    const payload: { checklistItemId: string; result: ChecklistResult; notes?: string; value?: string }[] = []
    for (const item of job.checklistTemplate.items) {
      const local = localResults[item.id]
      if (!local?.result) continue
      if (item.requiresValue && local.result !== 'NOT_APPLICABLE' && !local.value.trim()) {
        return { payload: [], error: `Nilai ${item.description} wajib diisi.` }
      }
      payload.push({
        checklistItemId: item.id,
        result: local.result,
        notes: local.notes.trim() || undefined,
        value: local.value.trim() || undefined,
      })
    }
    if (!payload.length) return { payload: [], error: 'Pilih hasil untuk minimal satu item checklist.' }
    return { payload, error: null as string | null }
  }

  async function handleStart() {
    if (!job) return
    setAction('start')
    const response = await submit('maintenance.start', { jobId: job.id })
    setAction(null)
    if (!response.ok) {
      Alert.alert('Gagal memulai', response.error ?? 'Pekerjaan tidak dapat dimulai.')
      return
    }
    patchJob((current) => ({ ...current, status: 'IN_PROGRESS', startedAt: new Date().toISOString() }))
    if (response.queued) {
      Alert.alert('Tersimpan offline', 'Pekerjaan akan dimulai otomatis saat perangkat kembali online.')
    }
  }

  async function saveResults(showAlert = true): Promise<SubmitResult | null> {
    if (!job) return null
    const { payload, error: validationError } = collectResults()
    if (validationError) {
      Alert.alert('Lengkapi checklist', validationError)
      return null
    }
    setAction('save')
    const response = await submit('maintenance.results', { jobId: job.id, results: payload })
    setAction(null)
    if (!response.ok) {
      Alert.alert('Gagal menyimpan', response.error ?? 'Hasil checklist tidak dapat disimpan.')
      return response
    }
    patchJob((current) => ({
      ...current,
      results: payload.map((item, index) => ({
        id: `local-${item.checklistItemId}-${index}`,
        checklistItemId: item.checklistItemId,
        result: item.result,
        notes: item.notes ?? null,
        value: item.value ?? null,
      })),
    }))
    if (showAlert) {
      Alert.alert(
        response.queued ? 'Tersimpan offline' : 'Hasil tersimpan',
        response.queued
          ? 'Hasil checklist tersimpan di perangkat dan akan dikirim saat online.'
          : 'Hasil checklist berhasil disimpan.'
      )
    }
    return response
  }

  async function handleComplete() {
    if (!job) return
    const requiredItems = (job.checklistTemplate?.items ?? []).filter((item) => item.isRequired)
    const missing = requiredItems.filter((item) => !localResults[item.id]?.result)
    if (missing.length) {
      Alert.alert('Checklist belum lengkap', `Masih ada ${missing.length} item wajib yang belum diisi.`)
      return
    }

    const withResult = Object.values(localResults).some((item) => item.result)
    if (withResult) {
      const saved = await saveResults(false)
      if (!saved || !saved.ok) return
    }
    setAction('complete')
    const response = await submit('maintenance.complete', { jobId: job.id, notes: completionNotes.trim() || undefined })
    setAction(null)
    if (!response.ok) {
      Alert.alert('Gagal menyelesaikan', response.error ?? 'Pekerjaan tidak dapat diselesaikan.')
      return
    }
    patchJob((current) => ({ ...current, status: 'COMPLETED', completedAt: new Date().toISOString(), notes: completionNotes.trim() || current.notes }))
    Alert.alert(
      response.queued ? 'Tersimpan offline' : 'Pekerjaan selesai',
      response.queued
        ? 'Penyelesaian pekerjaan akan dikirim saat perangkat kembali online.'
        : 'Pekerjaan maintenance telah diselesaikan.'
    )
  }

  function handleCancel() {
    if (!job) return
    Alert.alert('Batalkan pekerjaan', 'Pekerjaan yang dibatalkan tidak dapat dilanjutkan. Lanjutkan?', [
      { text: 'Tidak', style: 'cancel' },
      {
        text: 'Batalkan',
        style: 'destructive',
        onPress: () => {
          setAction('cancel')
          void submit('maintenance.cancel', { jobId: job.id, reason: 'Dibatalkan melalui aplikasi mobile' }).then((response) => {
            setAction(null)
            if (!response.ok) {
              Alert.alert('Gagal membatalkan', response.error ?? 'Pekerjaan tidak dapat dibatalkan.')
              return
            }
            patchJob((current) => ({ ...current, status: 'CANCELLED' }))
          })
        },
      },
    ])
  }

  const canStart = job && ['SCHEDULED', 'OVERDUE'].includes(job.status)
  const inProgress = job?.status === 'IN_PROGRESS'
  const finished = job && ['COMPLETED', 'CANCELLED'].includes(job.status)
  const isBusy = action !== null

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <PageHeader
        onBack={() => router.back()}
        title={job?.jobNumber ?? 'Detail pekerjaan'}
        subtitle={job ? `${job.asset.brand} ${job.asset.model} · ${job.asset.assetTag}` : 'Memuat pekerjaan…'}
      />

      <SyncStatusBanner />

      {isLoading ? <Loading /> : null}

      {isError ? (
        <EmptyState
          title="Pekerjaan tidak dapat dimuat"
          message={error instanceof Error ? error.message : 'Periksa koneksi ke server.'}
          icon="cloud-offline-outline"
          actionLabel="Coba lagi"
          onAction={refetch}
        />
      ) : null}

      {job ? (
        <>
          <View style={styles.badgeRow}>
            <Badge label={statusLabels[job.status] ?? job.status} tone={statusTone[job.status] ?? 'neutral'} />
            {job.plan ? <Badge label={job.plan.name} tone="info" /> : null}
          </View>

          <Card style={styles.card}>
            <AppText variant="subtitle">Jadwal pekerjaan</AppText>
            <InfoRow icon="calendar-outline" label="Jadwal" value={formatDate(job.scheduledDate)} />
            {job.startedAt ? <InfoRow icon="play-outline" label="Dimulai" value={formatDate(job.startedAt, true)} /> : null}
            {job.completedAt ? <InfoRow icon="checkmark-done-outline" label="Selesai" value={formatDate(job.completedAt, true)} /> : null}
            <InfoRow icon="person-outline" label="Teknisi" value={job.technician?.name ?? 'Belum ditugaskan'} />
            {job.checklistTemplate ? <InfoRow icon="list-outline" label="Checklist" value={job.checklistTemplate.name} /> : null}
            {job.notes ? <InfoRow icon="document-text-outline" label="Catatan" value={job.notes} /> : null}
          </Card>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/assets/[id]', params: { id: job.asset.id } })}
            style={({ pressed }) => [pressed ? styles.pressed : null]}>
            <Card style={styles.assetCard}>
              <View style={styles.assetIcon}>
                <Ionicons name="cube-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.assetText}>
                <AppText style={styles.assetTitle}>{job.asset.assetTag}</AppText>
                <AppText variant="caption">
                  {deviceTypeLabels[job.asset.deviceType] ?? job.asset.deviceType} · {job.asset.brand} {job.asset.model}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
            </Card>
          </Pressable>

          {canStart ? (
            <Card style={styles.card}>
              <AppText variant="subtitle">Mulai pekerjaan</AppText>
              <AppText variant="caption">
                Mulai pekerjaan untuk membuka checklist dan mencatat hasil inspeksi. Aksi ini dapat dilakukan offline.
              </AppText>
              <Button title="Mulai sekarang" loading={action === 'start'} disabled={isBusy} onPress={() => void handleStart()} />
            </Card>
          ) : null}

          {job.checklistTemplate?.items.length ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AppText variant="heading">Checklist</AppText>
                <AppText variant="caption">
                  {job.results.length}/{job.checklistTemplate.items.length} terisi
                </AppText>
              </View>

              {job.checklistTemplate.items.map((item) => {
                const saved = job.results.find((result) => result.checklistItemId === item.id)
                const local = localResults[item.id] ?? { value: '', notes: '' }
                const displayResult = local.result ?? saved?.result

                if (finished) {
                  return (
                    <Card key={item.id} style={styles.checklistCard}>
                      <View style={styles.rowBetween}>
                        <AppText style={styles.itemTitle}>{item.orderIndex}. {item.description}</AppText>
                        {displayResult ? (
                          <Badge label={RESULT_OPTIONS.find((option) => option.value === displayResult)?.label ?? displayResult} tone={RESULT_TONE[displayResult] ?? 'neutral'} />
                        ) : (
                          <Badge label="Belum diisi" tone="neutral" />
                        )}
                      </View>
                      <AppText variant="caption">{item.category}</AppText>
                      {saved?.value ? <AppText variant="caption">Nilai: {saved.value} {item.valueUnit ?? ''}</AppText> : null}
                      {saved?.notes ? <AppText variant="caption">Catatan: {saved.notes}</AppText> : null}
                    </Card>
                  )
                }

                return (
                  <Card key={item.id} style={styles.checklistCard}>
                    <View style={styles.rowBetween}>
                      <AppText style={styles.itemTitle}>{item.orderIndex}. {item.description}</AppText>
                      {item.isRequired ? <Badge label="Wajib" tone="warning" /> : null}
                    </View>
                    <AppText variant="caption">{item.category}{item.requiresValue ? ` · butuh nilai${item.valueUnit ? ` (${item.valueUnit})` : ''}` : ''}</AppText>

                    <ChoiceChips
                      options={RESULT_OPTIONS}
                      value={local.result ?? saved?.result}
                      onChange={(value) => updateLocal(item.id, { result: value as ChecklistResult })}
                      disabled={!inProgress || isBusy}
                    />

                    {item.requiresValue && (local.result ?? saved?.result) !== 'NOT_APPLICABLE' ? (
                      <Input
                        label={`Nilai${item.valueUnit ? ` (${item.valueUnit})` : ''}`}
                        value={local.value}
                        onChangeText={(value) => updateLocal(item.id, { value })}
                        editable={inProgress && !isBusy}
                        keyboardType="decimal-pad"
                        placeholder="Masukkan hasil pengukuran"
                      />
                    ) : null}

                    <Input
                      label="Catatan"
                      value={local.notes}
                      onChangeText={(value) => updateLocal(item.id, { notes: value })}
                      editable={inProgress && !isBusy}
                      placeholder="Opsional"
                      multiline
                    />
                  </Card>
                )
              })}

              {inProgress ? (
                <Button
                  title="Simpan hasil"
                  variant="secondary"
                  loading={action === 'save'}
                  disabled={isBusy}
                  onPress={() => void saveResults()}
                  icon={<Ionicons name="save-outline" size={18} color={colors.primaryDark} />}
                />
              ) : null}
            </View>
          ) : (
            <Card style={styles.card}>
              <AppText variant="subtitle">Tanpa checklist</AppText>
              <AppText variant="caption">Pekerjaan ini tidak memiliki template checklist. Anda dapat langsung menyelesaikan pekerjaan.</AppText>
            </Card>
          )}

          {inProgress ? (
            <Card style={styles.card}>
              <AppText variant="subtitle">Selesaikan pekerjaan</AppText>
              <AppText variant="caption">
                Pastikan seluruh item wajib telah diisi. Hasil yang belum tersimpan akan dikirim bersama penyelesaian.
              </AppText>
              <Input
                label="Catatan penyelesaian"
                value={completionNotes}
                onChangeText={setCompletionNotes}
                editable={!isBusy}
                placeholder="Opsional"
                multiline
              />
              <Button
                title="Selesaikan pekerjaan"
                loading={action === 'complete'}
                disabled={isBusy}
                onPress={() => void handleComplete()}
                icon={<Ionicons name="checkmark-done-outline" size={18} color="#ffffff" />}
              />
              <Button
                title="Batalkan pekerjaan"
                variant="danger"
                loading={action === 'cancel'}
                disabled={isBusy}
                onPress={handleCancel}
              />
            </Card>
          ) : null}

          <Button
            title="Laporkan masalah pada aset ini"
            variant="secondary"
            icon={<Ionicons name="alert-circle-outline" size={18} color={colors.primaryDark} />}
            onPress={() =>
              router.push({
                pathname: '/incidents/new',
                params: {
                  assetId: job.asset.id,
                  assetLabel: `${job.asset.assetTag} · ${job.asset.brand} ${job.asset.model}`,
                  maintenanceJobId: job.id,
                },
              })
            }
          />

          {job.incidents.length ? (
            <Card style={styles.card}>
              <AppText variant="subtitle">Insiden terkait</AppText>
              {job.incidents.map((incident) => (
                <Pressable
                  key={incident.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/incidents/[id]', params: { id: incident.id } })}
                  style={({ pressed }) => [styles.listRow, pressed ? styles.pressed : null]}>
                  <View style={styles.listText}>
                    <AppText style={styles.listTitle}>{incident.incidentNumber}</AppText>
                    <AppText variant="caption">{humanizeKey(incident.priority)}</AppText>
                  </View>
                  <Badge label={statusLabels[incident.status] ?? incident.status} tone={statusTone[incident.status] ?? 'neutral'} />
                  <Ionicons name="chevron-forward" size={16} color={colors.textSoft} />
                </Pressable>
              ))}
            </Card>
          ) : null}

          {!canStart && !inProgress && !finished ? (
            <Card style={styles.card}>
              <AppText variant="caption">Status pekerjaan ini tidak dapat diubah dari aplikasi.</AppText>
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
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoLabel: { width: 88 },
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
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  checklistCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '600' },
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
