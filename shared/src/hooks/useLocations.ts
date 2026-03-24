import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LensLogApi } from '../api/services'
import type { LocationFormValues } from '../schemas'

export const LOCATIONS_QUERY_KEY = 'locations' as const

export function useLocations(
  api: LensLogApi,
  params?: { lat?: number; lng?: number; radius?: number }
) {
  return useQuery({
    queryKey: [LOCATIONS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await api.locations.list(params)
      return res.data
    },
  })
}

export function useLocation(api: LensLogApi, id: string) {
  return useQuery({
    queryKey: [LOCATIONS_QUERY_KEY, id],
    queryFn: async () => {
      const res = await api.locations.get(id)
      return res.data
    },
    enabled: Boolean(id),
  })
}

export function useLocationWeather(api: LensLogApi, id: string) {
  return useQuery({
    queryKey: [LOCATIONS_QUERY_KEY, id, 'weather'],
    queryFn: async () => {
      const res = await api.locations.getWeather(id)
      return res.data
    },
    enabled: Boolean(id),
    // Weather data is valid for 30 minutes — matches the Redis TTL on the backend
    staleTime: 30 * 60 * 1000,
  })
}

export function useCreateLocation(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: LocationFormValues) => api.locations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_QUERY_KEY] })
    },
  })
}

export function useDeleteLocation(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.locations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LOCATIONS_QUERY_KEY] })
    },
  })
}
