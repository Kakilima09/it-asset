import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { APP_VERSION } from '@/lib/config'
import { setupOnlineManager } from '@/lib/network'
import { persister } from '@/lib/persister'
import { queryClient } from '@/lib/query-client'
import { SyncProvider } from '@/lib/sync-context'
import { colors } from '@/lib/theme'

void SplashScreen.preventAutoHideAsync()
setupOnlineManager()

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7, buster: APP_VERSION }}>
          <AuthProvider>
            <SyncProvider>
              <RootNavigator />
              <StatusBar style="dark" />
            </SyncProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

function RootNavigator() {
  const { status } = useAuth()

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync()
  }, [status])

  if (status === 'loading') return null

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
