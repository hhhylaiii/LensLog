import React, { useState } from 'react'

interface GearItem {
  id: string
  type: string
  brand?: string
  model: string
}

const GearVault: React.FC = () => {
  const [gear, setGear] = useState<GearItem[]>([])

  return (
    <div className="gear-vault">
      <h1>🎒 數位器材庫</h1>
      <p>管理你的相機、鏡頭、閃燈等器材</p>
      {gear.length === 0 ? (
        <p style={{ color: '#888' }}>目前沒有任何器材，請新增你的第一件器材！</p>
      ) : (
        <ul>
          {gear.map(item => (
            <li key={item.id}>
              [{item.type}] {item.brand} {item.model}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default GearVault
