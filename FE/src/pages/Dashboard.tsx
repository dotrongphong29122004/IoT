import { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { curveCardinal } from 'd3-shape'
import {
  IconThermometerSm, IconDropletSm, IconSunSm, IconBulbDash
} from '../components/Icons'

const socket = io('http://localhost:3000')

interface DataPoint {
  time: string;
  temp: number | null;
  humidity: number | null;
  light: number | null;
}

function StatCard({ icon, label, value, unit, accent, trend }: {
  icon: React.ReactNode; label: string; value: number | null | undefined; unit: string; accent: string; trend: 'up' | 'down' | 'stable'
}) {
  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'
  const trendColor = trend === 'up' ? 'text-coral' : trend === 'down' ? 'text-blue-vivid' : 'text-muted'
  return (
    <div className="bg-card rounded-[--radius] shadow-sm p-[20px_22px] flex flex-col gap-2.5 flex-1 min-w-0" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center" style={{ background: `${accent}15` }}>
          {icon}
        </div>
        <span className={`text-[11px] font-mono font-semibold tracking-[0.02em] ${trendColor}`}>
          {trendSymbol} LIVE
        </span>
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-[34px] font-semibold text-foreground leading-none">{value !== null && value !== undefined ? value : '--'}</span>
          <span className="text-[14px] font-medium" style={{ color: accent }}>{unit}</span>
        </div>
        <div className="mt-1 text-[11px] text-muted font-medium tracking-[0.06em] uppercase">{label}</div>
      </div>
    </div>
  )
}

function ToggleSwitch({ on, onToggle, loading }: { on: boolean; onToggle: () => void; loading?: boolean }) {
  return (
    <div 
      onClick={loading ? undefined : onToggle} 
      className={`w-11 h-6 rounded-full relative transition-colors duration-250 shrink-0 ${
        loading ? 'opacity-70 cursor-wait' : 'cursor-pointer'
      } ${on ? 'bg-[#38dd7a]' : 'bg-[#e2e8f0]'}`}
    >
      <div className={`w-[18px] h-[18px] rounded-full bg-white absolute top-[3px] transition-all duration-250 shadow-md flex items-center justify-center ${on ? 'left-[23px]' : 'left-[3px]'}`}>
        {loading && (
          <svg className="animate-spin w-[12px] h-[12px] text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-sidebar rounded-lg p-[8px_12px] shadow-lg">
      <p className="text-[#7baec0] text-[10px] font-mono mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-[11px] font-mono my-0.5">
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DataPoint[]>([])
  
  const [led1, setLed1] = useState(false)
  const [led2, setLed2] = useState(false)
  const [loadingLed, setLoadingLed] = useState<number | null>(null)
  
  const [isLoadingChart, setIsLoadingChart] = useState(true)

  const validData = data.filter(d => d.temp !== null || d.humidity !== null || d.light !== null)
  const current = validData[validData.length - 1]
  const prev = validData[validData.length - 2]
  const trend = (cur?: number | null, prv?: number | null): 'up' | 'down' | 'stable' => {
    if (cur === undefined || cur === null || prv === undefined || prv === null) return 'stable'
    return cur > prv + 0.5 ? 'up' : cur < prv - 0.5 ? 'down' : 'stable'
  }

  useEffect(() => {
    setIsLoadingChart(true)

    // LẤY TRẠNG THÁI LED LÚC KHỞI ĐỘNG
    axios.get('http://localhost:3000/api/devices')
      .then(res => {
        const devices = res.data.data;
        devices.forEach((d: any) => {
          if (d.MaTB === 1) setLed1(d.TrangThaiHienTai === 'ON');
          if (d.MaTB === 2) setLed2(d.TrangThaiHienTai === 'ON');
        });
      })
      .catch(console.error);

    axios.get('http://localhost:3000/api/dashboard/chart-history?limit=30')
      .then(res => {
        const grouped = res.data.reduce((acc: any, curr: any) => {
          const time = new Date(curr.ThoiGian).toLocaleTimeString('vi-VN', { hour12: false })
          if (!acc[time]) acc[time] = { time }
          if (curr.LoaiCB === 'Nhiệt độ') acc[time].temp = curr.GiaTri
          if (curr.LoaiCB === 'Độ ẩm') acc[time].humidity = curr.GiaTri
          if (curr.LoaiCB === 'Ánh sáng') acc[time].light = curr.GiaTri
          return acc
        }, {})
        
        const fetchedData = Object.values(grouped).reverse() as DataPoint[]
        
        const padCount = 30 - fetchedData.length;
        const paddedData: DataPoint[] = [];
        
        let baseTime = new Date();
        if (fetchedData.length > 0) {
          const [h, m, s] = fetchedData[0].time.split(':').map(Number);
          baseTime.setHours(h, m, s, 0);
        }
        
        for (let i = 0; i < padCount; i++) {
          baseTime = new Date(baseTime.getTime() - 2000);
          paddedData.unshift({
            time: baseTime.toLocaleTimeString('vi-VN', { hour12: false }),
            temp: null,
            humidity: null,
            light: null
          });
        }
        
        setData([...paddedData, ...fetchedData])
        setIsLoadingChart(false)
      })
      .catch(err => {
          console.error("Lỗi lấy dữ liệu ban đầu:", err)
          setIsLoadingChart(false)
      })

    socket.on('sensor-data', (newData) => {
      const time = new Date().toLocaleTimeString('vi-VN', { hour12: false })
      setData(prevData => {
        const nextPoint = { time, temp: newData.temp, humidity: newData.hum, light: newData.lux }
        if (prevData.length === 0) return [nextPoint]
        return [...prevData.slice(1), nextPoint]
      })
    })

    socket.on('device-status', (statusData) => {
      if (statusData.maTB === 1) setLed1(statusData.trangThai === 'ON')
      if (statusData.maTB === 2) setLed2(statusData.trangThai === 'ON')
      setLoadingLed(null) 
    })

    return () => {
      socket.off('sensor-data')
      socket.off('device-status')
    }
  }, [])

  const toggleDevice = async (maTB: number, currentState: boolean) => {
    if (loadingLed) return; 
    setLoadingLed(maTB)
    const hanhDong = currentState ? "OFF" : "ON"

    try {
      // Gọi API điều khiển (nó sẽ chờ Backend đếm giờ 3.5s)
      await axios.post('http://localhost:3000/api/device/control', { maTB, hanhDong })
      

    } catch (error) {
      console.error("Lỗi điều khiển thiết bị", error)
      // Nếu API trả về lỗi (bao gồm lỗi Timeout 408 từ Backend)
      setLoadingLed(null) // Tắt hiệu ứng loading, gạt công tắc về vị trí cũ (Rollback)
      alert(`Điều khiển thất bại! Thiết bị Node #07 không phản hồi.`);
    }
  }

  return (
    <main className="flex-1 p-[24px_28px] overflow-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[20px] font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="m-[2px_0_0] text-[12px] text-muted font-mono">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · Real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-3 py-1.5 text-[11px] text-foreground font-mono">
            <span className="w-[7px] h-[7px] rounded-full bg-emerald inline-block animate-pulse" />
            LIVE
          </div>
          <div className="bg-card border border-border rounded-lg px-3 py-1.5 text-[11px] text-muted font-mono">Refresh: 2s</div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="flex gap-4">
        <StatCard icon={<IconThermometerSm size={22} />} label="Nhiệt độ" value={current?.temp} unit="°C" accent="#E55959" trend={trend(current?.temp, prev?.temp)} />
        <StatCard icon={<IconDropletSm size={22} />} label="Độ ẩm" value={current?.humidity} unit="%" accent="#3498DB" trend={trend(current?.humidity, prev?.humidity)} />
        <StatCard icon={<IconSunSm size={22} />} label="Ánh sáng" value={current?.light} unit="lux" accent="#F1C40F" trend={trend(current?.light, prev?.light)} />
      </div>

      {/* Main Content: Chart & Controls */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Chart */}
        <div className="flex-1 bg-card rounded-[--radius] shadow-sm p-[20px_20px_14px] flex flex-col relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="m-0 text-[14px] font-semibold text-foreground">Biểu đồ thời gian thực</h2>
              <p className="m-[2px_0_0] text-[11px] text-muted font-mono">Cập nhật liên tục · {validData.length} điểm dữ liệu</p>
            </div>
            <div className="flex gap-3.5 text-[11px] font-mono">
              {[{ color: '#E55959', label: 'Temp (°C)' }, { color: '#3498DB', label: 'Humidity (%)' }, { color: '#F1C40F', label: 'Light (lux)' }].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-muted">
                  <span className="w-5 h-0.5 inline-block rounded-xs" style={{ background: color }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-[200px] relative">
            {isLoadingChart ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-card z-10">
                  <div className="w-6 h-6 border-2 border-[#E55959] border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="text-muted text-[11px] font-mono">Đang đồng bộ dữ liệu...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="#f0f4f8" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fill: '#8a9ab0' }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis yAxisId="left" orientation="left" domain={[0, 100]} tick={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fill: '#8a9ab0' }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', fill: '#8a9ab0' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line yAxisId="left" type={curveCardinal.tension(0.25)} dataKey="temp" name="Temp" stroke="#E55959" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#E55959', strokeWidth: 0 }} connectNulls={true} />
                  <Line yAxisId="left" type={curveCardinal.tension(0.25)} dataKey="humidity" name="Humidity" stroke="#3498DB" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#3498DB', strokeWidth: 0 }} connectNulls={true} />
                  <Line yAxisId="right" type={curveCardinal.tension(0.25)} dataKey="light" name="Light" stroke="#F1C40F" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#F1C40F', strokeWidth: 0 }} connectNulls={true} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* LED Control Panel */}
        <div className="w-[180px] bg-card rounded-[--radius] shadow-sm p-[20px_18px] flex flex-col gap-4">
          <div>
            <h2 className="m-0 text-[13px] font-semibold text-foreground">LED Control</h2>
            <p className="m-[2px_0_0] text-[10px] text-muted font-mono">Node #07</p>
          </div>
          <div className="flex flex-col gap-3">
            {[
              { maTB: 1, id: 'LED 1', on: led1, toggle: () => toggleDevice(1, led1), isLoading: loadingLed === 1 }, 
              { maTB: 2, id: 'LED 2', on: led2, toggle: () => toggleDevice(2, led2), isLoading: loadingLed === 2 }
            ].map(({ maTB, id, on, toggle, isLoading }) => (
              <div key={id} className={`rounded-[10px] p-[14px] flex flex-col gap-2.5 border transition-colors ${on ? 'bg-[#9ab7a6]/5 border-[#2ECC71]/20' : 'bg-[#f8fafc] border-border'} ${isLoading ? 'opacity-80' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${on ? 'bg-[#2ECC71]/15' : 'bg-[#f0f4f8]'}`}>
                    <IconBulbDash on={on} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-foreground">{id}</div>
                    <div className={`text-[9px] font-mono font-semibold tracking-[0.06em] transition-colors ${isLoading ? 'text-[#f99419]' : on ? 'text-[#25bc5f]' : 'text-[#8A9AB0]'}`}>
                      {isLoading ? 'WAIT...' : (on ? 'ON' : 'OFF')}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <ToggleSwitch on={on} onToggle={toggle} loading={isLoading} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}