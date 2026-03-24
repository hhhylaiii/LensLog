import React from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useGear, useDeleteGear } from '@shared/hooks/useGear'
import { api } from '../../src/api'
import type { Gear } from '@shared/types'

const GEAR_TYPE_LABELS: Record<Gear['type'], string> = {
  body: '機身',
  lens: '鏡頭',
  flash: '閃燈',
  tripod: '腳架',
  filter: '濾鏡',
  memory_card: '記憶卡',
}

function GearRow({ item, onDelete }: { item: Gear; onDelete: (id: string) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text style={styles.badge}>{GEAR_TYPE_LABELS[item.type]}</Text>
        <Text style={styles.model}>
          {item.brand ? `${item.brand} ` : ''}{item.model}
        </Text>
        {item.last_maintained && (
          <Text style={styles.meta}>上次保養：{item.last_maintained}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() =>
          Alert.alert('刪除器材', `確定要刪除 ${item.model}？`, [
            { text: '取消', style: 'cancel' },
            { text: '刪除', style: 'destructive', onPress: () => onDelete(item.id) },
          ])
        }
      >
        <Text style={styles.deleteBtn}>刪除</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function GearScreen() {
  const { data: gear, isLoading, isError } = useGear(api)
  const deleteMutation = useDeleteGear(api)

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>無法載入器材資料，請稍後再試</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {!gear || gear.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>目前沒有任何器材，請新增你的第一件器材！</Text>
        </View>
      ) : (
        <FlatList
          data={gear}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GearRow item={item} onDelete={(id) => deleteMutation.mutate(id)} />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  list: { padding: 16, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
  },
  rowContent: { flex: 1 },
  badge: {
    fontSize: 11,
    color: '#93c5fd',
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  model: { color: '#f8fafc', fontSize: 15, fontWeight: '600' },
  meta: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  errorText: { color: '#f87171', fontSize: 16 },
  emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center', padding: 24 },
  deleteBtn: { color: '#f87171', fontSize: 14 },
})
