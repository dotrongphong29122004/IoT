export interface DataPoint {
  time: string
  temp: number
  humidity: number
  light: number
}

export type SensorType = 'temp' | 'humidity' | 'light'

export interface SensorRow {
  id: string
  device: string
  type: SensorType
  value: number
  unit: string
  datetime: string
  rawValue: number
}

export type HistoryStatus = 'success' | 'error'
export type HistoryFilter = 'Tất cả' | 'Thành công' | 'Thất bại'

export interface HistoryRow {
  id: string
  device: string
  deviceNo: number
  action: 'on' | 'off'
  status: HistoryStatus
  datetime: string
}

export function timestamp(offset: number) {
  const d = new Date(Date.now() - offset * 1000)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`
}

export function fullDatetime(offsetMinutes: number) {
  const d = new Date(Date.now() - offsetMinutes * 60 * 1000)
  const dd = d.getDate().toString().padStart(2, '0')
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = d.getHours().toString().padStart(2, '0')
  const min = d.getMinutes().toString().padStart(2, '0')
  const ss = d.getSeconds().toString().padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`
}

export function seed(base: number, range: number, noise: number) {
  return +(base + (Math.random() - 0.5) * range + Math.sin(Date.now() / 3000) * noise).toFixed(1)
}

export function initData(): DataPoint[] {
  return Array.from({ length: 20 }, (_, i) => ({
    time: timestamp(19 - i),
    temp: seed(28, 4, 1.5),
    humidity: seed(65, 10, 3),
    light: seed(450, 80, 20),
  }))
}

const SENSOR_DEVICES = ['Node #07', 'Node #12', 'Node #03', 'Node #19', 'Node #05']

export function generateTableData(): SensorRow[] {
  const rows: SensorRow[] = []
  let id = 1
  const types: SensorType[] = ['temp', 'humidity', 'light']

  for (let i = 0; i < 40; i++) {
    const type = types[i % 3]
    const device = SENSOR_DEVICES[i % SENSOR_DEVICES.length]
    const offsetMin = i * 3 + Math.floor(Math.random() * 5)

    let value = 0
    let unit = ''
    if (type === 'temp') { value = +(26 + Math.random() * 8).toFixed(1); unit = '°C' }
    if (type === 'humidity') { value = +(55 + Math.random() * 20).toFixed(1); unit = '%' }
    if (type === 'light') { value = +(380 + Math.random() * 160).toFixed(0); unit = 'lux' }

    rows.push({
      id: `#${String(id++).padStart(3, '0')}`,
      device: `${device} · ${type === 'temp' ? 'Nhiệt độ' : type === 'humidity' ? 'Độ ẩm' : 'Ánh sáng'}`,
      type,
      value,
      unit,
      datetime: fullDatetime(offsetMin),
      rawValue: value,
    })
  }
  return rows
}

export const ALL_ROWS = generateTableData()

const HISTORY_STATUSES: HistoryStatus[] = ['success', 'success', 'success', 'error', 'success']

export function generateHistoryData(): HistoryRow[] {
  return Array.from({ length: 85 }, (_, i) => {
    const deviceNo = (i % 2) + 1
    const action: 'on' | 'off' = i % 3 === 0 ? 'off' : 'on'
    const status = HISTORY_STATUSES[i % HISTORY_STATUSES.length]
    return {
      id: `#H${String(i + 1).padStart(3, '0')}`,
      device: `LED ${deviceNo}`,
      deviceNo,
      action,
      status,
      datetime: fullDatetime(i * 2 + Math.floor(Math.random() * 3)),
    }
  })
}

export const ALL_HISTORY = generateHistoryData()