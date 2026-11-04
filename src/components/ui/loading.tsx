import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { AppText } from './app-text'
import { colors, spacing } from '@/lib/theme'

export function Loading({ label = 'Memuat data…' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <AppText variant="caption">{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
})
