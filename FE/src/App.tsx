import { useState } from 'react'
import Sidebar from './components/Sidebar'
import DashboardPage from './pages/Dashboard'
import DataSensorPage from './pages/DataSensor'
import HistoryPage from './pages/History'
import ProfilePage from './pages/Profile'

export default function App() {
  const [activeNav, setActiveNav] = useState('Dashboard')

  return (
    <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', background: '#F5F7F9', fontFamily: 'Inter, sans-serif' }}>
      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      
      {activeNav === 'Dashboard' && <DashboardPage />}
      {activeNav === 'Data Sensor' && <DataSensorPage />}
      {activeNav === 'History' && <HistoryPage />}
      {activeNav === 'Profile' && <ProfilePage />}
      
      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        button:focus-visible { outline: 2px solid #00BCD4; outline-offset: 2px; }
        input::placeholder, textarea::placeholder { color: #b0bec5; }
      `}</style>
    </div>
  )
}