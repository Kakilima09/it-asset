import { Pressable, StyleSheet, View } from 'react-native'
import { AppText } from './app-text'
import { colors, radius, spacing } from '@/lib/theme'

export interface ChoiceOption {
  value: string
  label: string
}

interface ChoiceChipsProps {
  options: ChoiceOption[]
  value: string | null | undefined
  onChange: (value: string) => void
  disabled?: boolean
}

export function ChoiceChips({ options, value, onChange, disabled }: ChoiceChipsProps) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.chip,
              selected ? styles.chipSelected : null,
              pressed && !disabled ? styles.pressed : null,
              disabled ? styles.disabled : null,
            ]}>
            <AppText style={[styles.label, selected ? styles.labelSelected : null]}>{option.label}</AppText>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text },
  labelSelected: { color: '#ffffff' },
})
