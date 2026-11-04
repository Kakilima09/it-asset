import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SyncMutationAction } from './types'

export interface QueuedMutation {
  id: string
  action: SyncMutationAction
  payload: Record<string, unknown>
  createdAt: string
  attempts: number
  lastError?: string
  failed?: boolean
}

const QUEUE_KEY = 'itassetpm.mutationQueue'

function createId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

let queue: QueuedMutation[] = []
let hydrated = false
let writeChain: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function persist() {
  const snapshot = queue
  writeChain = writeChain
    .then(() => AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(snapshot)))
    .catch(() => undefined)
}

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getQueueSnapshot(): QueuedMutation[] {
  return queue
}

export async function hydrateQueue(): Promise<void> {
  if (hydrated) return
  hydrated = true
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as QueuedMutation[]
    if (Array.isArray(parsed)) {
      queue = parsed.filter((item) => item && typeof item.id === 'string' && typeof item.action === 'string')
      notify()
    }
  } catch {
    queue = []
  }
}

export async function enqueueMutation(
  action: SyncMutationAction,
  payload: Record<string, unknown>,
  id?: string
): Promise<QueuedMutation> {
  await hydrateQueue()
  const mutation: QueuedMutation = {
    id: id ?? createId(),
    action,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  }
  queue = [...queue, mutation]
  persist()
  notify()
  return mutation
}

export async function removeQueueItems(ids: string[]): Promise<void> {
  if (!ids.length) return
  const remove = new Set(ids)
  queue = queue.filter((item) => !remove.has(item.id))
  persist()
  notify()
}

export async function updateQueueItems(
  ids: string[],
  patch: Partial<Pick<QueuedMutation, 'attempts' | 'lastError' | 'failed'>>
): Promise<void> {
  if (!ids.length) return
  const update = new Set(ids)
  queue = queue.map((item) => (update.has(item.id) ? { ...item, ...patch } : item))
  persist()
  notify()
}

export async function retryFailedMutations(): Promise<void> {
  queue = queue.map((item) => (item.failed ? { ...item, failed: false, attempts: 0, lastError: undefined } : item))
  persist()
  notify()
}

export async function discardMutation(id: string): Promise<void> {
  await removeQueueItems([id])
}

export async function clearMutationQueue(): Promise<void> {
  queue = []
  persist()
  notify()
}
