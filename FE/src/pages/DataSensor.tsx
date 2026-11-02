import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  IconSearch, IconArrowUp, IconArrowDown, 
  IconChevronLeft, IconChevronRight, IconThermometerSm, IconDropletSm, IconSunSm 
} from '../components/Icons'

const SORT_OPTIONS = ['Thời gian', 'Giá trị'] as const
type SortOption = typeof SORT_OPTIONS[number]

// Map đúng với LoaiCB trả về từ SQL (Nhiệt độ, Độ ẩm, Ánh sáng)
const SENSOR_META: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  'Nhiệt độ': { icon: <IconThermometerSm />, color: '#E55959', label: 'Nhiệt độ' },
  'Độ ẩm': { icon: <IconDropletSm />, color: '#3498DB', label: 'Độ ẩm' },
  'Ánh sáng': { icon: <IconSunSm />, color: '#F1C40F', label: 'Ánh sáng' },
}

export default function DataSensorPage() {
  // State lưu dữ liệu API
  const [dataRows, setDataRows] = useState<any[]>([])
  const [totalRecords, setTotalRecords] = useState(0)
  
  // State lưu trữ dữ liệu đang nhập dở (Chưa lọc)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('all')

  // State lưu trữ dữ liệu chính thức ĐÃ BẤM TÌM KIẾM (Được gửi lên API)
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedSearchField, setAppliedSearchField] = useState('all')

  // State sắp xếp và phân trang
  const [sortBy, setSortBy] = useState<SortOption>('Thời gian')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Gọi API mỗi khi các tham số chính thức thay đổi
  useEffect(() => {
    fetchData()
  }, [page, pageSize, appliedSearch, appliedSearchField, sortBy, sortAsc])

  const fetchData = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/data-sensor`, {
        params: {
          page,
          limit: pageSize,
          search: appliedSearch,
          searchField: appliedSearchField,
          sortBy: sortBy === 'Thời gian' ? 'time' : 'value',
          order: sortAsc ? 'asc' : 'desc'
        }
      })
      setDataRows(res.data.data)
      setTotalRecords(res.data.pagination.total)
    } catch (error) {
      console.error("Lỗi lấy dữ liệu:", error)
    }
  }

  // Hàm xử lý khi bấm nút Tìm kiếm
  const handleSearch = () => {
    setAppliedSearch(search)
    setAppliedSearchField(searchField)
    setPage(1)
  }

  const handleSort = (option: SortOption) => {
    if (sortBy === option) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(option)
      setSortAsc(false)
    }
    setPage(1) // Reset về trang 1 khi đổi tiêu chí sắp xếp
  }

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(page, totalPages)

  const pageNums = () => {
    const nums: (number | '...')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) nums.push(i)
    } else {
      nums.push(1)
      if (safePage > 3) nums.push('...')
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) nums.push(i)
      if (safePage < totalPages - 2) nums.push('...')
      nums.push(totalPages)
    }
    return nums
  }

  return (
    <main className="flex-1 p-[24px_28px] overflow-auto flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[20px] font-bold text-foreground tracking-tight">Data Sensor</h1>
          <p className="m-[2px_0_0] text-[12px] text-muted font-mono">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · {totalRecords} bản ghi
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald/10 border border-emerald/20 rounded-lg px-3 py-1.5">
          <span className="w-[7px] h-[7px] rounded-full bg-emerald inline-block animate-pulse" />
          <span className="text-[11px] text-emerald font-mono font-semibold">LIVE</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Search Input */}
        <div className="flex items-center gap-2 w-[380px] bg-card border border-border rounded-lg px-4 py-2.5 shadow-xs">
          <IconSearch />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={
              searchField === 'temp' ? "Nhập giá trị nhiệt độ..." :
              searchField === 'humidity' ? "Nhập giá trị độ ẩm..." :
              searchField === 'light' ? "Nhập giá trị ánh sáng..." :
              searchField === 'time' ? "Nhập thời gian..." : 
              "Tìm theo giá trị, ID, thời gian..."
            }
            className="flex-1 border-none outline-none bg-transparent text-[12px] text-foreground font-sans min-w-0"
          />
          {search && (
            <button onClick={() => { setSearch(''); setAppliedSearch(''); setPage(1) }} className="bg-transparent border-none cursor-pointer text-muted text-sm p-0 leading-none">×</button>
          )}
        </div>

        {/* Lọc phạm vi & Nút Tìm kiếm */}
        <div className="flex items-center gap-2">
          <select 
            value={searchField} 
            onChange={e => setSearchField(e.target.value)}
            className="bg-card border border-border text-foreground text-[12px] rounded-lg px-3 py-2.5 outline-none cursor-pointer shadow-xs"
          >
            <option value="all">Tất cả</option>
            <option value="temp">Nhiệt độ</option>
            <option value="humidity">Độ ẩm</option>
            <option value="light">Ánh sáng</option>
            <option value="time">Thời gian</option>
          </select>

          <button 
            onClick={handleSearch}
            className="bg-primary text-primary-foreground border-none rounded-lg px-4 py-2.5 text-[12px] font-semibold cursor-pointer shadow-xs transition-opacity hover:opacity-90"
          >
            Tìm kiếm
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-[--radius] shadow-sm overflow-hidden flex-1 flex flex-col mt-2">
        {/* Table header */}
        <div className="grid grid-cols-[80px_1fr_140px_180px] bg-[#F5F7F9] border-b-2 border-border px-5">
          <div className="py-3 text-[10px] font-bold text-muted tracking-[0.08em] text-left">ID</div>
          <div className="py-3 text-[10px] font-bold text-muted tracking-[0.08em] text-left">THIẾT BỊ</div>
          
          <button
            onClick={() => handleSort('Giá trị')}
            className={`py-3 text-[10px] font-bold tracking-[0.08em] text-right bg-transparent border-none cursor-pointer flex items-center justify-end gap-1 ${
              sortBy === 'Giá trị' ? 'text-primary' : 'text-muted'
            }`}
          >
            GIÁ TRỊ
            <span className={`flex flex-col gap-0.5 ${sortBy === 'Giá trị' ? 'opacity-100' : 'opacity-30'}`}>
              <IconArrowUp active={sortBy === 'Giá trị' && sortAsc} />
              <IconArrowDown active={sortBy === 'Giá trị' && !sortAsc} />
            </span>
          </button>

          <button
            onClick={() => handleSort('Thời gian')}
            className={`py-3 text-[10px] font-bold tracking-[0.08em] text-right bg-transparent border-none cursor-pointer flex items-center justify-end gap-1 ${
              sortBy === 'Thời gian' ? 'text-primary' : 'text-muted'
            }`}
          >
            THỜI GIAN
            <span className={`flex flex-col gap-0.5 ${sortBy === 'Thời gian' ? 'opacity-100' : 'opacity-30'}`}>
              <IconArrowUp active={sortBy === 'Thời gian' && sortAsc} />
              <IconArrowDown active={sortBy === 'Thời gian' && !sortAsc} />
            </span>
          </button>
        </div>

        {/* Rows */}
        {dataRows.length === 0 ? (
          <div className="py-[60px] px-5 flex flex-col items-center gap-3">
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c0cdd8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <div className="text-[13px] text-[#b0bec5] font-sans">Không tìm thấy hoặc đang tải dữ liệu...</div>
          </div>
        ) : (
          dataRows.map((row, idx) => {
            // Lấy meta data theo tên loại từ DB. Nếu lỗi fallback về 'Nhiệt độ'
            const meta = SENSOR_META[row.type] || SENSOR_META['Nhiệt độ']
            const isHovered = hoveredRow === row.id
            const timeFormat = new Date(row.datetime).toLocaleString('vi-VN')
            
            return (
              <div
                key={row.id}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`grid grid-cols-[80px_1fr_140px_180px] px-5 transition-colors duration-120 cursor-default ${
                  idx < dataRows.length - 1 ? 'border-b border-[#f0f4f8]' : ''
                } ${isHovered ? 'bg-[#f8fbff]' : 'bg-transparent'}`}
              >
                <div className="py-[13px] flex items-center">
                  <span className="font-mono text-[12px] text-muted font-medium">#{row.id}</span>
                </div>

                <div className="py-[13px] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0" style={{ background: `${meta.color}15` }}>
                    {meta.icon}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-foreground">{row.device}</div>
                    <div className="text-[10px] font-mono font-medium" style={{ color: meta.color }}>{meta.label}</div>
                  </div>
                </div>

                <div className="py-[13px] flex items-center justify-end">
                  <span className="font-mono text-[14px] font-bold" style={{ color: meta.color }}>
                    {row.value}
                    <span className="text-[11px] font-medium text-muted ml-[3px]">{row.unit}</span>
                  </span>
                </div>

                <div className="py-[13px] flex items-center justify-end">
                  <span className="text-[11px] text-[#b0bec5] font-mono">{timeFormat}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-muted font-mono">
          Hiển thị trang {safePage} / {totalPages || 1}
        </span>

        <div className="flex items-center gap-5">
          {/* Lựa chọn Page Size */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-mono">Số dòng/trang:</span>
            <select
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="bg-card border border-border text-foreground text-[11px] rounded-[6px] px-2 py-1 outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={20}>20</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className={`w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center transition-opacity ${
                safePage === 1 ? 'opacity-50 cursor-default text-[#c0cdd8]' : 'cursor-pointer text-foreground'
              }`}
            >
              <IconChevronLeft />
            </button>

            {pageNums().map((n, i) =>
              n === '...' ? (
                <span key={`ellipsis-${i}`} className="w-8 text-center text-[12px] text-muted">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n as number)}
                  className={`w-8 h-8 rounded-lg font-mono text-[12px] cursor-pointer transition-all ${
                    n === safePage 
                      ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 border-none' 
                      : 'bg-card text-[#4a5568] border border-border font-normal'
                  }`}
                >
                  {n}
                </button>
              )
            )}

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className={`w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center transition-opacity ${
                safePage === totalPages ? 'opacity-50 cursor-default text-[#c0cdd8]' : 'cursor-pointer text-foreground'
              }`}
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}