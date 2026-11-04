import { Stack } from 'expo-router'
import { colors } from '@/lib/theme'

export default function AppStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="assets/[id]" />
      <Stack.Screen name="maintenance/[id]" />
      <Stack.Screen name="incidents/index" />
      <Stack.Screen name="incidents/new" />
      <Stack.Screen name="incidents/[id]" />
    </Stack>
  )
}
