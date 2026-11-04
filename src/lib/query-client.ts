import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: (failureCount, error) => {
        if (typeof error === 'object' && error && 'status' in error) {
          const status = (error as { status?: number }).status
          if (status && status >= 400 && status < 500) return false
        }
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
    },
  },
})
