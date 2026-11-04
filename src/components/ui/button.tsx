import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type ViewStyle } from 'react-native'
import { AppText } from './app-text'
import { colors, radius, spacing } from '@/lib/theme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string
  variant?: Variant
  loading?: boolean
  icon?: ReactNode
  style?: ViewStyle
}

export function Button({ title, variant = 'primary', loading, disabled, icon, style, ...props }: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...props}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary} />
      ) : (
        <>
          {icon}
          <AppText style={[styles.label, labelVariants[variant]]}>{title}</AppText>
        </>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15, fontWeight: '600' },
})

const labelVariants: Record<Variant, { color: string }> = {
  primary: { color: '#ffffff' },
  secondary: { color: colors.primaryDark },
  ghost: { color: colors.text },
  danger: { color: colors.danger },
}
