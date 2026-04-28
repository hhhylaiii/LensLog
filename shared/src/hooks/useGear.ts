import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { LensLogApi } from '../api/services'
import type { GearFormValues } from '../schemas'

export const GEAR_QUERY_KEY = 'gear' as const

export function useGear(api: LensLogApi) {
  return useQuery({
    queryKey: [GEAR_QUERY_KEY],
    queryFn: async () => {
      const res = await api.gear.list()
      return res.data
    },
  })
}

export function useGearItem(api: LensLogApi, id: string) {
  return useQuery({
    queryKey: [GEAR_QUERY_KEY, id],
    queryFn: async () => {
      const res = await api.gear.get(id)
      return res.data
    },
    enabled: Boolean(id),
  })
}

export function useCreateGear(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GearFormValues) => api.gear.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GEAR_QUERY_KEY] })
    },
  })
}

export function useDeleteGear(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.gear.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GEAR_QUERY_KEY] })
    },
  })
}

export function useUpdateGear(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GearFormValues & { last_maintained: string }> }) =>
      api.gear.update(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: [GEAR_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [GEAR_QUERY_KEY] })
    },
  })
}

export function useRecordMaintenance(api: LensLogApi) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.gear.recordMaintenance(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: [GEAR_QUERY_KEY, id] })
      queryClient.invalidateQueries({ queryKey: [GEAR_QUERY_KEY] })
    },
  })
}
