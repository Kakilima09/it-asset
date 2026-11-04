import NetInfo from '@react-native-community/netinfo'
import { onlineManager } from '@tanstack/react-query'

let configured = false

export function setupOnlineManager() {
  if (configured) return
  configured = true
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      const reachable = state.isInternetReachable !== false
      setOnline(state.isConnected !== false && reachable)
    })
  )
}
