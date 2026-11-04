import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useDeferredValue, useState } from 'react'
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
import { api } from '@/lib/api-client'
import { useSync } from '@/lib/sync-context'
import { colors, deviceTypeLabels, radius, spacing } from '@/lib/theme'
import type { IncidentPriority } from '@/lib/types'

const CATEGORIES = [
  'Hardware Rusak',
  'Software Error',
  'Koneksi Jaringan',
  'Performa Lambat',
  'Baterai / Daya',
  'Layar / Display',
  'Keyboard / Input Device',
  'Printer / Cetak',
  'Data / Storage',
  'Keamanan / Security',
  'Lainnya',
] as const

const CATEGORY_OPTIONS: ChoiceOption[] = CATEGORIES.map((category) => ({ value: category, label: category }))

const PRIORITY_OPTIONS: ChoiceOption[] = [
  { value: 'LOW', label: 'Rendah' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'CRITICAL', label: 'Kritis' },
]

interface SelectedAsset {
  id: string
  label: string
}

export default function NewIncidentScreen() {
  const params = useLocalSearchParams<{ assetId?: string; assetLabel?: string; maintenanceJobId?: string }>()
  const { submit, discard } = useSync()
  const [asset, setAsset] = useState<SelectedAsset | null>(
    params.assetId ? { id: params.assetId, label: params.assetLabel ?? params.assetId } : null
  )
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>(CATEGORIES[0])
  const [priority, setPriority] = useState<IncidentPriority>('MEDIUM')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const deferredSearch = useDeferredValue(search)

  const assetsQuery = useQuery({
    queryKey: ['assets', deferredSearch],
    queryFn: () => api.assets({ search: deferredSearch || undefined, limit: 20 }),
    enabled: !asset,
  })

  const canSubmit = Boolean(asset) && description.trim().length >= 10 && !busy

  async function handleSubmit() {
    if (!asset) return
    if (description.trim().length < 10) {
      Alert.alert('Deskripsi terlalu pendek', 'Jelaskan masalah minimal 10 karakter.')
      return
    }
    setBusy(true)
    const response = await submit('incident.create', {
      data: {
        assetId: asset.id,
        category,
        priority,
        description: description.trim(),
        maintenanceJobId: params.maintenanceJobId || undefined,
      },
    })
    setBusy(false)

    if (!response.ok) {
      if (response.permanent) {
        await discard(response.id)
        Alert.alert('Gagal mengirim laporan', response.error ?? 'Laporan tidak dapat disimpan.')
        return
      }
      Alert.alert(
        'Laporan tersimpan',
        'Server belum dapat dihubungi. Laporan tetap tersimpan di perangkat dan akan dikirim otomatis.',
        [{ text: 'Mengerti', onPress: () => router.replace('/incidents') }]
      )
      return
    }

    if (response.queued) {
      Alert.alert(
        'Tersimpan offline',
        'Laporan tersimpan di perangkat dan akan dikirim otomatis saat online. Anda dapat memantau antrean di halaman Lainnya.',
        [{ text: 'Mengerti', onPress: () => router.replace('/incidents') }]
      )
      return
    }

    const created = (response.data as { incident?: { id?: string } } | undefined)?.incident
    Alert.alert('Laporan terkirim', 'Tim IT akan meninjau laporan Anda.', [
      {
        text: 'Lihat laporan',
        onPress: () =>
          created?.id
            ? router.replace({ pathname: '/incidents/[id]', params: { id: created.id } })
            : router.replace('/incidents'),
      },
    ])
  }

  return (
    <Screen>
      <PageHeader onBack={() => router.back()} title="Laporkan masalah" subtitle="Laporan dibuat dengan status Terbuka." />

      <Card style={styles.card}>
        <AppText variant="subtitle">Aset</AppText>
        {asset ? (
          <View style={styles.selectedAsset}>
            <View style={styles.assetIcon}>
              <Ionicons name="cube-outline" size={20} color={colors.primary} />
            </View>
            <AppText style={styles.selectedText}>{asset.label}</AppText>
            <Button title="Ganti" variant="ghost" onPress={() => setAsset(null)} style={styles.changeButton} />
          </View>
        ) : (
          <>
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Cari tag, barcode, merek, atau serial"
              autoCapitalize="none"
              autoCorrect={false}
              rightAccessory={<Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />}
            />
            {assetsQuery.isLoading ? <Loading label="Memuat aset…" /> : null}
            {assetsQuery.isError ? (
              <EmptyState
                title="Aset tidak dapat dimuat"
                message={assetsQuery.error instanceof Error ? assetsQuery.error.message : 'Periksa koneksi ke server.'}
                icon="cloud-offline-outline"
                actionLabel="Coba lagi"
                onAction={() => void assetsQuery.refetch()}
              />
            ) : null}
            {assetsQuery.data?.assets.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => setAsset({ id: item.id, label: `${item.assetTag} · ${item.brand} ${item.model}` })}
                style={({ pressed }) => [styles.assetRow, pressed ? styles.pressed : null]}>
                <View style={styles.assetText}>
                  <AppText style={styles.assetTag}>{item.assetTag}</AppText>
                  <AppText variant="caption">
                    {deviceTypeLabels[item.deviceType] ?? item.deviceType} · {item.brand} {item.model}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textSoft} />
              </Pressable>
            ))}
            {assetsQuery.data && !assetsQuery.data.assets.length ? (
              <AppText variant="caption">Tidak ada aset yang cocok. Coba kata kunci lain.</AppText>
            ) : null}
          </>
        )}
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Kategori</AppText>
        <ChoiceChips options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Prioritas</AppText>
        <ChoiceChips options={PRIORITY_OPTIONS} value={priority} onChange={(value) => setPriority(value as IncidentPriority)} />
        <View style={styles.priorityHint}>
          <Badge label="Panduan" tone="info" />
          <AppText variant="caption" style={styles.hintText}>
            Pilih Kritis bila pekerjaan terhenti total dan membutuhkan penanganan segera.
          </AppText>
        </View>
      </Card>

      <Card style={styles.card}>
        <AppText variant="subtitle">Deskripsi</AppText>
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder="Jelaskan gejala, kapan terjadi, dan dampaknya."
          multiline
          style={styles.description}
        />
        <AppText variant="caption">{description.trim().length}/10 karakter minimum</AppText>
      </Card>

      <Button
        title="Kirim laporan"
        loading={busy}
        disabled={!canSubmit}
        onPress={() => void handleSubmit()}
        icon={<Ionicons name="send-outline" size={18} color="#ffffff" />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  selectedAsset: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  assetIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: { flex: 1, fontSize: 14, fontWeight: '600' },
  changeButton: { minHeight: 36, paddingHorizontal: spacing.md },
  searchIcon: { paddingRight: spacing.xs },
  assetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  assetText: { flex: 1, gap: 2 },
  assetTag: { fontWeight: '700', fontSize: 14 },
  pressed: { opacity: 0.7 },
  priorityHint: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  hintText: { flex: 1 },
  description: { minHeight: 110, textAlignVertical: 'top', paddingTop: spacing.sm },
})
