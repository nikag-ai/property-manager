import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 1 min
      gcTime: 5 * 60_000,     // 5 min
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

// Query key factory
export const keys = {
  properties:    () => ['properties'] as const,
  property:      (id: string) => ['properties', id] as const,
  metrics:       (id: string) => ['metrics', id] as const,
  transactions:  (id: string, filters?: Record<string, unknown>) => ['transactions', id, filters ?? {}] as const,
  monthly:       (id: string) => ['monthly', id] as const,
  amortization:  (id: string) => ['amortization', id] as const,
  leases:        (id: string) => ['leases', id] as const,
  activeLease:   (id: string) => ['leases', id, 'active'] as const,
  autoPostRules: (id: string) => ['auto-post-rules', id] as const,
  tags:          (id: string) => ['tags', id] as const,
  profile:       () => ['profile'] as const,
}
