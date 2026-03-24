import { useQuery } from '@tanstack/react-query'
import type { LensLogApi } from '../api/services'

export const STATS_QUERY_KEY = 'stats' as const

export function useUserStats(api: LensLogApi) {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'me'],
    queryFn: async () => {
      const res = await api.stats.me()
      return res.data
    },
    // Stats are pre-computed on the backend with Redis caching,
    // so 5 minutes stale time is appropriate
    staleTime: 5 * 60 * 1000,
  })
}

export function useFocalLengthStats(api: LensLogApi) {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'focal-length'],
    queryFn: async () => {
      const res = await api.stats.focalLength()
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useApertureStats(api: LensLogApi) {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'aperture'],
    queryFn: async () => {
      const res = await api.stats.aperture()
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useMonthlyStats(api: LensLogApi) {
  return useQuery({
    queryKey: [STATS_QUERY_KEY, 'monthly'],
    queryFn: async () => {
      const res = await api.stats.monthly()
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
