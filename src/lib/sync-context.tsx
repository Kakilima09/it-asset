import AsyncStorage from '@react-native-async-storage/async-storage'
import { onlineManager } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { AppState } from 'react-native'
import { api } from './api-client'
import { useAuth } from './auth-context'
import {
  discardMutation,
  enqueueMutation,
  getQueueSnapshot,
  hydrateQueue,
  removeQueueItems,
  retryFailedMutations,
  subscribeQueue,
  updateQueueItems,
} from './mutation-queue'
import { queryClient } from './query-client'
import type { SyncMutationAction, SyncPushResult } from './types'

const LAST_SYNC_KEY = 'itassetpm.lastSyncedAt'

export interface SubmitResult {
  id: string
  ok: boolean
  queued: boolean
  permanent?: boolean
  error?: string
  data?: unknown
}

interface SyncContextValue {
  online: boolean
  syncing: boolean
  pendingCount: number
  failedCount: number
  lastSyncedAt: string | null
  lastError: string | null
  submit: (action: SyncMutationAction, payload: Record<string, unknown>) => Promise<SubmitResult>
  syncNow: () => Promise<void>
  retryFailed: () => Promise<void>
  discard: (id: string) => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

const subscribeOnline = (listener: () => void) => onlineManager.subscribe(listener)
const getOnlineSnapshot = () => onlineManager.isOnline()

function isTransientStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const queue = useSyncExternalStore(subscribeQueue, getQueueSnapshot, getQueueSnapshot)
  const online = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineSnapshot)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const lock = useRef<Promise<void> | null>(null)

  const pendingCount = queue.length
  const failedCount = queue.filter((item) => item.failed).length

  useEffect(() => {
    void hydrateQueue()
    void AsyncStorage.getItem(LAST_SYNC_KEY).then((value) => {
      if (value) setLastSyncedAt(value)
    })
  }, [])

  const syncNow = useCallback(async (): Promise<void> => {
    if (lock.current) return lock.current
    if (!onlineManager.isOnline()) return

    const run = (async () => {
      await hydrateQueue()
      const pending = getQueueSnapshot().filter((item) => !item.failed)
      if (!pending.length) return

      setSyncing(true)
      setLastError(null)
      const allResults: SyncPushResult[] = []

      try {
        for (let index = 0; index < pending.length; index += 50) {
          if (!onlineManager.isOnline()) break
          const batch = pending.slice(index, index + 50)
          let response: Awaited<ReturnType<typeof api.syncPush>>
          try {
            response = await api.syncPush(
              batch.map((item) => ({ id: item.id, action: item.action, payload: item.payload }))
            )
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Sinkronisasi gagal'
            await updateQueueItems(
              batch.map((item) => item.id),
              { attempts: Math.max(...batch.map((item) => item.attempts)) + 1, lastError: message }
            )
            setLastError(message)
            break
          }

          allResults.push(...response.results)
          const succeeded: string[] = []
          const rejected: { id: string; error: string }[] = []
          const transient: { id: string; error: string }[] = []

          for (const result of response.results) {
            if (result.ok) {
              succeeded.push(result.id)
            } else if (isTransientStatus(result.status)) {
              transient.push({ id: result.id, error: result.error ?? 'Server sibuk' })
            } else {
              rejected.push({ id: result.id, error: result.error ?? 'Mutasi ditolak server' })
            }
          }

          await removeQueueItems(succeeded)

          if (transient.length) {
            const attempts = Math.max(...batch.map((item) => item.attempts)) + 1
            await updateQueueItems(transient.map((item) => item.id), {
              attempts,
              lastError: transient[0]?.error,
            })
            setLastError(transient[0]?.error ?? null)
          }

          for (const item of rejected) {
            await updateQueueItems([item.id], { failed: true, lastError: item.error })
          }
          if (rejected.length) setLastError(rejected[0].error)
        }

        if (allResults.some((result) => result.ok)) {
          await queryClient.invalidateQueries()
        }

        const syncedAt = new Date().toISOString()
        await AsyncStorage.setItem(LAST_SYNC_KEY, syncedAt)
        setLastSyncedAt(syncedAt)
      } finally {
        setSyncing(false)
      }
    })()

    lock.current = run
    try {
      await run
    } finally {
      lock.current = null
    }
  }, [])

  const submit = useCallback(
    async (action: SyncMutationAction, payload: Record<string, unknown>): Promise<SubmitResult> => {
      const mutation = await enqueueMutation(action, payload)
      if (!onlineManager.isOnline()) {
        return { id: mutation.id, ok: true, queued: true }
      }
      await syncNow()
      let result = getQueueSnapshot().find((item) => item.id === mutation.id)
      if (result && !result.failed && onlineManager.isOnline()) {
        await syncNow()
        result = getQueueSnapshot().find((item) => item.id === mutation.id)
      }
      if (!result) return { id: mutation.id, ok: true, queued: false }
      return {
        id: mutation.id,
        ok: false,
        queued: true,
        permanent: Boolean(result.failed),
        error: result.lastError ?? 'Mutasi belum tersinkron',
      }
    },
    [syncNow]
  )

  const retryFailed = useCallback(async () => {
    await retryFailedMutations()
    await syncNow()
  }, [syncNow])

  const discard = useCallback(async (id: string) => {
    await discardMutation(id)
  }, [])

  useEffect(() => {
    if (status !== 'signedIn') return
    void syncNow()
    const unsubscribe = onlineManager.subscribe((isOnline) => {
      if (isOnline) void syncNow()
    })
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow()
    })
    return () => {
      unsubscribe()
      subscription.remove()
    }
  }, [status, syncNow])

  const value = useMemo(
    () => ({
      online,
      syncing,
      pendingCount,
      failedCount,
      lastSyncedAt,
      lastError,
      submit,
      syncNow,
      retryFailed,
      discard,
    }),
    [online, syncing, pendingCount, failedCount, lastSyncedAt, lastError, submit, syncNow, retryFailed, discard]
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) throw new Error('useSync harus dipakai di dalam SyncProvider')
  return context
}
