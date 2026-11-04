import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, View } from 'react-native'
import { AppText } from './ui/app-text'
import { Button } from './ui/button'
import { formatRelative } from '@/lib/format'
import { useSync } from '@/lib/sync-context'
import { colors, radius, spacing } from '@/lib/theme'

export function SyncStatusBanner({ showWhenIdle = false }: { showWhenIdle?: boolean }) {
  const { online, syncing, pendingCount, failedCount, lastSyncedAt, lastError, syncNow, retryFailed } = useSync()
  const isIdle = online && !syncing && !pendingCount && !failedCount
  if (isIdle && !showWhenIdle) return null

  if (!online) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
        <View style={styles.textWrap}>
          <AppText style={styles.title}>Mode offline</AppText>
          <AppText variant="caption">
            {pendingCount
              ? `${pendingCount} perubahan tersimpan dan akan dikirim otomatis saat online.`
              : 'Data dari cache ditampilkan. Perubahan akan diantrekan sampai koneksi kembali.'}
          </AppText>
        </View>
      </View>
    )
  }

  if (failedCount) {
    return (
      <View style={[styles.banner, styles.failed]}>
        <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
        <View style={styles.textWrap}>
          <AppText style={styles.title}>{failedCount} perubahan ditolak server</AppText>
          {lastError ? <AppText variant="caption">{lastError}</AppText> : null}
          <Button title="Coba kirim ulang" variant="secondary" onPress={() => void retryFailed()} style={styles.action} />
        </View>
      </View>
    )
  }

  if (syncing || pendingCount) {
    return (
      <View style={[styles.banner, styles.syncing]}>
        <Ionicons name={syncing ? 'sync-outline' : 'cloud-upload-outline'} size={18} color={colors.info} />
        <View style={styles.textWrap}>
          <AppText style={styles.title}>{syncing ? 'Menyinkronkan perubahan…' : `${pendingCount} perubahan menunggu`}</AppText>
          <AppText variant="caption">Antrean tersimpan aman di perangkat.</AppText>
        </View>
        {!syncing ? <Button title="Kirim" variant="secondary" onPress={() => void syncNow()} style={styles.compact} /> : null}
      </View>
    )
  }

  return (
    <View style={[styles.banner, styles.idle]}>
      <Ionicons name="cloud-done-outline" size={18} color={colors.success} />
      <View style={styles.textWrap}>
        <AppText style={styles.title}>Tersinkron</AppText>
        <AppText variant="caption">{lastSyncedAt ? `Terakhir ${formatRelative(lastSyncedAt)}` : 'Belum ada perubahan tertunda.'}</AppText>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  offline: { backgroundColor: colors.warningSoft, borderColor: '#fcd34d' },
  failed: { backgroundColor: colors.dangerSoft, borderColor: '#fca5a5' },
  syncing: { backgroundColor: colors.infoSoft, borderColor: '#67e8f9' },
  idle: { backgroundColor: colors.successSoft, borderColor: '#86efac' },
  textWrap: { flex: 1, gap: 2 },
  title: { fontSize: 13, fontWeight: '700', color: colors.text },
  action: { marginTop: spacing.sm, alignSelf: 'flex-start', minHeight: 38 },
  compact: { minHeight: 36, paddingHorizontal: spacing.md },
})
