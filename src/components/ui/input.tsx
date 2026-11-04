import type { ReactNode } from 'react'
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native'
import { AppText } from './app-text'
import { colors, radius, spacing } from '@/lib/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string | null
  hint?: string
  rightAccessory?: ReactNode
}

export function Input({ label, error, hint, rightAccessory, style, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      {label ? <AppText variant="label" style={styles.label}>{label}</AppText> : null}
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <TextInput
          placeholderTextColor={colors.textSoft}
          style={[styles.input, style]}
          {...props}
        />
        {rightAccessory}
      </View>
      {error ? <AppText style={styles.error}>{error}</AppText> : null}
      {!error && hint ? <AppText variant="caption">{hint}</AppText> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginBottom: 2 },
  inputWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
})
