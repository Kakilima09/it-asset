import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'itassetpm.query-cache',
  throttleTime: 1000,
})

export async function clearPersistedCache(): Promise<void> {
  await persister.removeClient()
}
