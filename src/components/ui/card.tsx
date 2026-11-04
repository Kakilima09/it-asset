import { StyleSheet, View, type ViewProps } from 'react-native'
import { colors, radius, spacing } from '@/lib/theme'

export function Card({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.card, style]} />
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
  },
})
