import type { GearItem, GearFilter } from '../types/gear'

export function filterGear(
  items: GearItem[],
  filter: GearFilter,
  search: string,
): GearItem[] {
  let result = items

  if (filter === 'maintenance_due') {
    result = result.filter(item => item.status === 'maintenance_due')
  } else if (filter !== 'all') {
    result = result.filter(item => item.type === filter)
  }

  if (search.trim()) {
    const q = search.trim().toLowerCase()
    result = result.filter(
      item =>
        item.model.toLowerCase().includes(q) ||
        (item.brand?.toLowerCase().includes(q) ?? false),
    )
  }

  return result
}

// Counts are always computed from the full gear array, not the filtered list.
export function computePillCounts(items: GearItem[]): Record<GearFilter, number> {
  return {
    all: items.length,
    body: items.filter(g => g.type === 'body').length,
    lens: items.filter(g => g.type === 'lens').length,
    flash: items.filter(g => g.type === 'flash').length,
    tripod: items.filter(g => g.type === 'tripod').length,
    filter: items.filter(g => g.type === 'filter').length,
    memory_card: items.filter(g => g.type === 'memory_card').length,
    maintenance_due: items.filter(g => g.status === 'maintenance_due').length,
  }
}
