import React from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native'
import { useUserStats } from '@shared/hooks/useStats'
import { api } from '../../src/api'

export default function StatsScreen() {
  const { data: stats, isLoading, isError } = useUserStats(api)

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (isError || !stats) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>無法載入統計資料，請稍後再試</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary cards */}
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{stats.total_photos}</Text>
          <Text style={styles.cardLabel}>張照片</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{stats.total_locations}</Text>
          <Text style={styles.cardLabel}>個景點</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardNum}>{stats.total_gear}</Text>
          <Text style={styles.cardLabel}>件器材</Text>
        </View>
      </View>

      {/* Focal length distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最常使用焦段</Text>
        {stats.focal_length_distribution.slice(0, 5).map((item) => (
          <View key={item.focal_length} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.focal_length}mm</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(
                      (item.count /
                        Math.max(...stats.focal_length_distribution.map((d) => d.count))) *
                        100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.barCount}>{item.count}</Text>
          </View>
        ))}
        {stats.focal_length_distribution.length === 0 && (
          <Text style={styles.emptyText}>上傳照片後自動生成圖表</Text>
        )}
      </View>

      {/* Monthly counts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>月度拍攝量</Text>
        {stats.monthly_counts.slice(-6).map((item) => (
          <View key={item.month} style={styles.barRow}>
            <Text style={styles.barLabel}>{item.month}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(
                      (item.count /
                        Math.max(...stats.monthly_counts.map((d) => d.count), 1)) *
                        100,
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.barCount}>{item.count}</Text>
          </View>
        ))}
        {stats.monthly_counts.length === 0 && (
          <Text style={styles.emptyText}>上傳照片後自動生成圖表</Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 16, gap: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  cardRow: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cardNum: { color: '#3b82f6', fontSize: 28, fontWeight: '700' },
  cardLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  section: { backgroundColor: '#1e293b', borderRadius: 8, padding: 16 },
  sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel: { color: '#94a3b8', fontSize: 13, width: 56 },
  barTrack: { flex: 1, height: 8, backgroundColor: '#334155', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
  barCount: { color: '#f8fafc', fontSize: 13, width: 36, textAlign: 'right' },
  errorText: { color: '#f87171', fontSize: 16 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', paddingVertical: 8 },
})
