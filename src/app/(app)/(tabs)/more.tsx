import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Alert, Pressable, StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Screen } from '@/components/ui/screen'
import { SyncStatusBanner } from '@/components/sync-status'
import { useAuth } from '@/lib/auth-context'
import { API_URL, APP_VERSION } from '@/lib/config'
import { formatRelative, initials } from '@/lib/format'
import { useSync } from '@/lib/sync-context'
import { colors, radius, roleLabels, spacing } from '@/lib/theme'

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <AppText variant="caption">{label}</AppText>
        <AppText variant="body">{value}</AppText>
      </View>
    </View>
  )
}

function MenuRow({ icon, label, description, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; description: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed ? styles.pressed : null]}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.infoText}>
        <AppText style={styles.menuLabel}>{label}</AppText>
        <AppText variant="caption">{description}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textSoft} />
    </Pressable>
  )
}

export default function MoreScreen() {
  const { user, signOut } = useAuth()
  const { online, pendingCount, lastSyncedAt, syncNow } = useSync()

  function confirmSignOut() {
    Alert.alert('Keluar', 'Yakin ingin keluar dari aplikasi?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void signOut() },
    ])
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">Lainnya</AppText>
        <AppText variant="caption">Akun dan informasi aplikasi.</AppText>
      </View>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{initials(user?.name)}</AppText>
        </View>
        <View style={styles.profileText}>
          <AppText variant="subtitle">{user?.name ?? 'Pengguna'}</AppText>
          <AppText variant="caption">{user?.email ?? '—'}</AppText>
          <Badge label={roleLabels[user?.role ?? ''] ?? 'Pengguna'} tone="info" />
        </View>
      </Card>

      <SyncStatusBanner showWhenIdle />

      <Card style={styles.menuCard}>
        <MenuRow
          icon="warning-outline"
          label="Insiden"
          description="Lihat dan laporkan masalah aset"
          onPress={() => router.push('/incidents')}
        />
        <MenuRow
          icon="sync-outline"
          label="Sinkronisasi"
          description={pendingCount ? `${pendingCount} perubahan menunggu` : lastSyncedAt ? `Terakhir ${formatRelative(lastSyncedAt)}` : 'Belum ada perubahan tertunda'}
          onPress={() => void syncNow()}
        />
      </Card>

      <Card style={styles.card}>
        <InfoRow icon="server-outline" label="Server API" value={API_URL} />
        <InfoRow icon="information-circle-outline" label="Versi aplikasi" value={APP_VERSION} />
        <InfoRow icon="cloud-offline-outline" label="Koneksi" value={online ? 'Online' : 'Offline'} />
      </Card>

      <Button title="Keluar" variant="danger" onPress={confirmSignOut} icon={<Ionicons name="log-out-outline" size={18} color={colors.danger} />} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileText: { flex: 1, gap: spacing.xs },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  card: { gap: spacing.lg },
  menuCard: { gap: 0, paddingVertical: 0 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuLabel: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: { flex: 1, gap: 2 },
})
