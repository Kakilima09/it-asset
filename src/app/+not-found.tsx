import { Link } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { AppText } from '@/components/ui/app-text'
import { colors, spacing } from '@/lib/theme'

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <AppText variant="heading">Halaman tidak ditemukan</AppText>
      <AppText variant="caption">Tautan yang Anda buka tidak tersedia di aplikasi ini.</AppText>
      <Link href="/" style={styles.link}>
        <AppText style={styles.linkText}>Kembali ke beranda</AppText>
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  link: { marginTop: spacing.lg },
  linkText: { color: colors.primary, fontWeight: '600' },
})
