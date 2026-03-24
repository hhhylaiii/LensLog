import React from 'react'

const Dashboard: React.FC = () => {
  return (
    <div className="dashboard">
      <h1>📊 拍攝數據儀表板</html>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>最常使用焦段</h3>
          {/* TODO: D3.js FocalLength Bar Chart */}
          <p style={{ color: '#888' }}>上傳照片後自動生成圖表</p>
        </div>
        <div className="stat-card">
          <h3>光圈偏好分佈</h3>
          {/* TODO: D3.js Aperture Pie Chart */}
          <p style={{ color: '#888' }}>上傳照片後自動生成圖表</p>
        </div>
        <div className="stat-card">
          <h3>ISO 使用趨勢</h3>
          {/* TODO: D3.js ISO Line Chart */}
          <p style={{ color: '#888' }}>上傳照片後自動生成圖表</p>
        </div>
        <div className="stat-card">
          <h3>月度拍攝量</h3>
          {/* TODO: Monthly count chart */}
          <p style={{ color: '#888' }}>上傳照片後自動生成圖表</p>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
