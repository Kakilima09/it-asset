import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router/js-tabs'
import { colors } from '@/lib/theme'

export default function AppTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Aset',
          tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="maintenance"
        options={{
          title: 'Pekerjaan',
          tabBarIcon: ({ color, size }) => <Ionicons name="construct-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => <Ionicons name="scan-outline" size={size} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Lainnya',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal-circle-outline" size={size} color={color as string} />,
        }}
      />
    </Tabs>
  )
}
