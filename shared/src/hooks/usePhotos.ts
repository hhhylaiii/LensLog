// ============================================================
// usePhotos — shared React Query hook
//
// Works in both web (React + Vite) and mobile (Expo + RN).
// The api instance is passed in so the hook stays decoupled
// from how the client was constructed.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LensLogApi } from '../api/services'
import type { Photo } from '../types'

export const PHOTOS_QUERY_KEY = 'photos' as const

export function usePhotos(api: LensLogApi, params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: [PHOTOS_QUERY_KEY, params],
    queryFn: async () => {
      const res = await api.photos.list(params)
      return res.data
    },
  })
}

export function usePhoto(api: LensLogApi, id: string) {
  return useQuery({
    queryKey: [PHOTOS_QUERY_KEY, id],
    queryFn: async () => {
      const res = await api.photos.get(id)
      return res.data
    },
    enabled: Boolean(id),
  })
}

export function useDeletePhoto(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.photos.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY] })
    },
  })
}

export function useCreatePhoto(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<LensLogApi['photos']['create']>[0]) =>
      api.photos.create(data),
    onSuccess: (response) => {
      const photo: Photo = response.data
      queryClient.invalidateQueries({ queryKey: [PHOTOS_QUERY_KEY] })
      return photo
    },
  })
}
