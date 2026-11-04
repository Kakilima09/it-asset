import Ionicons from '@expo/vector-icons/Ionicons'
import { StyleSheet, View } from 'react-native'
import { AppText } from './app-text'
import { Button } from './button'
import { colors, radius, spacing } from '@/lib/theme'

interface EmptyStateProps {
  title: string
  message?: string
  icon?: keyof typeof Ionicons.glyphMap
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, message, icon = 'information-circle-outline', actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <AppText variant="subtitle" style={styles.title}>{title}</AppText>
      {message ? <AppText variant="caption" style={styles.message}>{message}</AppText> : null}
      {actionLabel && onAction ? <Button title={actionLabel} variant="secondary" onPress={onAction} style={styles.action} /> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', maxWidth: 300 },
  action: { marginTop: spacing.md, minWidth: 160 },
})
