import Ionicons from '@expo/vector-icons/Ionicons'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from './app-text'
import { colors, radius, spacing } from '@/lib/theme'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}

export function PageHeader({ title, subtitle, onBack, right }: PageHeaderProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={onBack}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.text}>
        <AppText variant="title" numberOfLines={2}>{title}</AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
  text: { flex: 1, gap: 2 },
})
