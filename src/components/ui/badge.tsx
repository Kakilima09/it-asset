import { StyleSheet, View } from 'react-native'
import { AppText } from './app-text'
import { colors, radius, spacing } from '@/lib/theme'

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps {
  label: string
  tone?: BadgeTone
}

const tones: Record<BadgeTone, { backgroundColor: string; color: string }> = {
  success: { backgroundColor: colors.successSoft, color: colors.success },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  info: { backgroundColor: colors.infoSoft, color: colors.info },
  neutral: { backgroundColor: '#f1f5f9', color: colors.textMuted },
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const toneStyle = tones[tone]
  return (
    <View style={[styles.badge, { backgroundColor: toneStyle.backgroundColor }]}>
      <AppText style={[styles.label, { color: toneStyle.color }]}>{label}</AppText>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
})
