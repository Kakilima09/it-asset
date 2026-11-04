import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useDeferredValue, useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Loading } from '@/components/ui/loading'
import { Screen } from '@/components/ui/screen'
import { api } from '@/lib/api-client'
import { formatNumber } from '@/lib/format'
import { colors, deviceTypeLabels, spacing, statusLabels, statusTone } from '@/lib/theme'

export default function AssetsScreen() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['assets', deferredSearch],
    queryFn: () => api.assets({ search: deferredSearch || undefined, limit: 50 }),
  })

  return (
    <Screen refreshing={isRefetching} onRefresh={refetch}>
      <View style={styles.header}>
        <AppText variant="title">Aset</AppText>
        <AppText variant="caption">
          {data ? `${formatNumber(data.total)} aset terdaftar` : 'Memuat data aset…'}
        </AppText>
      </View>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Cari tag, barcode, merek, atau serial"
        autoCapitalize="none"
        autoCorrect={false}
        rightAccessory={<Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />}
      />

      {isLoading ? <Loading /> : null}

      {isError ? (
        <EmptyState
          title="Gagal memuat aset"
          message={error instanceof Error ? error.message : 'Periksa koneksi ke server.'}
          icon="cloud-offline-outline"
          actionLabel="Coba lagi"
          onAction={refetch}
        />
      ) : null}

      {data && !data.assets.length ? (
        <EmptyState
          title="Tidak ada aset"
          message={search ? `Tidak ditemukan aset untuk "${search}".` : 'Belum ada aset yang terdaftar.'}
          icon="cube-outline"
        />
      ) : null}

      {data?.assets.map((asset) => (
        <Pressable
          key={asset.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/assets/[id]', params: { id: asset.id } })}
          style={({ pressed }) => [pressed ? styles.pressed : null]}>
          <Card style={styles.assetCard}>
            <View style={styles.rowBetween}>
              <View style={styles.assetHeading}>
                <AppText variant="mono" style={styles.assetTag}>{asset.assetTag}</AppText>
                <AppText variant="caption">{deviceTypeLabels[asset.deviceType] ?? asset.deviceType}</AppText>
              </View>
              <Badge
                label={statusLabels[asset.lifecycleStatus] ?? asset.lifecycleStatus}
                tone={statusTone[asset.lifecycleStatus] ?? 'neutral'}
              />
            </View>

            <AppText variant="subtitle">{asset.brand} {asset.model}</AppText>

            <View style={styles.meta}>
              {asset.user ? (
                <View style={styles.metaRow}>
                  <Ionicons name="person-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption">{asset.user.name}</AppText>
                </View>
              ) : null}
              {asset.division ? (
                <View style={styles.metaRow}>
                  <Ionicons name="business-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption">{asset.division.name}</AppText>
                </View>
              ) : null}
              {asset.location ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <AppText variant="caption">{asset.location.name}</AppText>
                </View>
              ) : null}
            </View>

            <View style={styles.rowBetween}>
              <AppText variant="caption">Kondisi</AppText>
              <Badge
                label={statusLabels[asset.conditionStatus] ?? asset.conditionStatus}
                tone={statusTone[asset.conditionStatus] ?? 'neutral'}
              />
            </View>
          </Card>
        </Pressable>
      ))}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  searchIcon: { paddingRight: spacing.xs },
  assetCard: { gap: spacing.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  assetHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  assetTag: { fontWeight: '700' },
  meta: { gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  pressed: { opacity: 0.75 },
})
