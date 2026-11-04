import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ApiError, api, hydrateTokensFromStorage, login as loginRequest, setApiTokens, setSessionExpiredHandler } from './api-client'
import { clearMutationQueue } from './mutation-queue'
import { clearPersistedCache } from './persister'
import { queryClient } from './query-client'
import { clearTokens, clearUser, getStoredUser, saveTokens, saveUser } from './storage'
import type { AuthUser, LoginResponse } from './types'

type AuthStatus = 'loading' | 'signedIn' | 'signedOut'

interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<AuthUser | null>(null)
  const mounted = useRef(true)

  const clearSession = useCallback(async () => {
    setApiTokens(null)
    queryClient.clear()
    await Promise.all([
      clearTokens(),
      clearUser(),
      clearMutationQueue(),
      clearPersistedCache().catch(() => undefined),
    ])
    if (mounted.current) {
      setUser(null)
      setStatus('signedOut')
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    setSessionExpiredHandler(() => {
      void clearSession()
    })
    return () => {
      mounted.current = false
      setSessionExpiredHandler(null)
    }
  }, [clearSession])

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const [stored, cachedUser] = await Promise.all([hydrateTokensFromStorage(), getStoredUser()])
      if (cancelled) return

      if (!stored) {
        setStatus('signedOut')
        return
      }

      setApiTokens(stored)
      try {
        const response = await api.me()
        if (cancelled) return
        setUser(response.user)
        await saveUser(response.user)
        setStatus('signedIn')
      } catch (error) {
        if (cancelled) return
        const isAuthError = error instanceof ApiError && (error.status === 401 || error.status === 403)
        if (!isAuthError && cachedUser) {
          setUser(cachedUser)
          setStatus('signedIn')
          return
        }
        await clearSession()
      }
    }

    void bootstrap()
    return () => {
      cancelled = true
    }
  }, [clearSession])

  const signIn = useCallback(async (email: string, password: string) => {
    const response: LoginResponse = await loginRequest(email.trim().toLowerCase(), password)
    setApiTokens(response.tokens)
    await Promise.all([saveTokens(response.tokens), saveUser(response.user)])
    setUser(response.user)
    setStatus('signedIn')
  }, [])

  const signOut = useCallback(async () => {
    try {
      await api.logout()
    } catch {
      // best effort; local session is cleared regardless
    }
    await clearSession()
  }, [clearSession])

  const refreshUser = useCallback(async () => {
    const response = await api.me()
    setUser(response.user)
    await saveUser(response.user)
  }, [])

  const value = useMemo(
    () => ({ status, user, signIn, signOut, refreshUser }),
    [status, user, signIn, signOut, refreshUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return context
}
