import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: { backgroundColor: '#0f172a' },
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f8fafc',
      }}
    >
      <Tabs.Screen
        name="map"
        options={{
          title: '地圖探索',
          tabBarLabel: '地圖',
          // TODO: add tabBarIcon with expo-vector-icons
        }}
      />
      <Tabs.Screen
        name="gear"
        options={{
          title: '數位器材庫',
          tabBarLabel: '器材',
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: '拍攝儀表板',
          tabBarLabel: '統計',
        }}
      />
    </Tabs>
  )
}
