import { useState, useEffect } from 'react'
import axios from 'axios'
import {
  IconSearch, IconArrowUp, IconArrowDown, IconChevronLeft, 
  IconChevronRight, IconBulbHistory, IconToggleOn, IconToggleOff
} from '../components/Icons'

// Cập nhật để hỗ trợ thêm trạng thái 'Đang xử lý'
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  'Thành công': { label: 'Thành công', color: '#2ECC71', bg: 'rgba(46,204,113,0.12)' },
  'Thất bại':   { label: 'Thất bại',   color: '#E55959', bg: 'rgba(229,89,89,0.12)'  },
  'Đang xử lý': { label: 'Đang xử lý', color: '#F1C40F', bg: 'rgba(241,196,15,0.12)' },
}

function PaginationBar({
  page, totalPages, onPage, countLabel, pageSize, onPageSizeChange
}: {
  page: number; totalPages: number; onPage: (n: number) => void; countLabel: string;
  pageSize: number; onPageSizeChange: (size: number) => void;
}) {
  const nums: (number | '...')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) nums.push(i)
  } else {
    nums.push(1)
    if (page > 3) nums.push('...')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) nums.push(i)
    if (page < totalPages - 2) nums.push('...')
    nums.push(totalPages)
  }

  return (
    <div className="flex items-center justify-between mt-1">
      <span className="text-[11px] text-muted font-mono">{countLabel}</span>
      
      <div className="flex items-center gap-5">
        {/* Lựa chọn Page Size */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted font-mono">Số dòng/trang:</span>
          <select
            value={pageSize}
            onChange={e => onPageSizeChange(Number(e.target.value))}
            className="bg-card border border-border text-foreground text-[11px] rounded-[6px] px-2 py-1 outline-none cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        {/* Nút chuyển trang */}
        <div className="flex items-center gap-1">
          <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
            className={`w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center font-mono text-[12px] transition-opacity ${
              page === 1 ? 'opacity-50 cursor-default text-[#c0cdd8]' : 'cursor-pointer text-foreground'
            }`}>
            <IconChevronLeft />
          </button>
          {nums.map((n, i) => n === '...'
            ? <span key={`e${i}`} className="w-8 text-center text-[12px] text-muted">…</span>
            : <button key={n} onClick={() => onPage(n as number)} className={`w-8 h-8 rounded-lg font-mono text-[12px] cursor-pointer transition-all ${
                n === page 
                  ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30 border-none' 
                  : 'bg-card text-[#4a5568] border border-border font-normal'
              }`}>{n}</button>
          )}
          <button onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
            className={`w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center font-mono text-[12px] transition-opacity ${
              page === totalPages ? 'opacity-50 cursor-default text-[#c0cdd8]' : 'cursor-pointer text-foreground'
            }`}>
            <IconChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function HistoryPage() {
  const [historyRows, setHistoryRows] = useState<any[]>([])
  
  // State API Pagination
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  
  // State Bộ lọc / Tìm kiếm
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortAsc, setSortAsc] = useState(false)
  
  const [hoveredRow, setHoveredRow] = useState<number | null>(null)
  
  // Quick stats lưu số lượng trạng thái từ DB (Tùy backend của bạn có hỗ trợ count không)
  const [counts, setCounts] = useState({ success: 0, processing: 0, error: 0 })

  useEffect(() => {
    fetchHistory()
  }, [page, pageSize, appliedSearch, deviceFilter, actionFilter, statusFilter, sortAsc]) 

  const fetchHistory = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/history`, {
        params: {
          page,
          limit: pageSize,
          search: appliedSearch,
          device: deviceFilter !== 'all' ? deviceFilter : undefined,
          action: actionFilter !== 'all' ? actionFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          order: sortAsc ? 'asc' : 'desc'
        }
      })
      
      setHistoryRows(res.data.data)
      setTotalRecords(res.data.pagination.total)
      
      // Nếu Backend của bạn trả về số lượng thống kê thì dùng, không thì tự đếm dựa trên totalRecords hoặc dataRows 
      // (Dưới đây là ví dụ mock từ tổng số data, bạn nên yêu cầu Backend API đếm chính xác và gửi về)
      if (res.data.counts) {
         setCounts(res.data.counts)
      } else {
         // Fallback tự tính (Chỉ tính trên trang hiện tại, chưa chính xác trên toàn DB)
         setCounts({
            success: res.data.data.filter((r: any) => r.status === 'Thành công').length,
            processing: res.data.data.filter((r: any) => r.status === 'Đang xử lý').length,
            error: res.data.data.filter((r: any) => r.status === 'Thất bại').length,
         })
      }
    } catch (error) {
      console.error("Lỗi lấy lịch sử:", error)
    }
  }

  const handleSearch = () => {
    setAppliedSearch(search)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize))
  const safePage = Math.min(page, totalPages)

  return (
    <main className="flex-1 p-[24px_28px] overflow-auto flex flex-col gap-4.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="m-0 text-[20px] font-bold text-foreground tracking-tight">History</h1>
          <p className="m-[2px_0_0] text-[12px] text-muted font-mono">
            Lịch sử thao tác thiết bị · {totalRecords} lượt thao tác
          </p>
        </div>
        
        {/* Quick stats */}
        <div className="flex gap-2">
          {([
            { status: 'Thành công', count: counts.success },
            { status: 'Đang xử lý', count: counts.processing },
            { status: 'Thất bại', count: counts.error },
          ]).map(({ status, count }) => {
            const m = STATUS_META[status]
            return (
              <div key={status} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5" style={{ background: m.bg }}>
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${status === 'Đang xử lý' ? 'animate-pulse' : ''}`} style={{ background: m.color }} />
                <span className="text-[11px] font-mono font-semibold" style={{ color: m.color }}>{count}</span>
                <span className="text-[11px] opacity-80" style={{ color: m.color }}>{m.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Toolbar với Thanh tìm kiếm & Các bộ lọc */}
      <div className="flex items-center gap-3">
        {/* Thanh tìm kiếm */}
        <div className="flex items-center gap-2 flex-1 max-w-[350px] bg-card border border-border rounded-lg px-4 py-2.5 shadow-xs">
          <IconSearch />
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Tìm theo thời gian, thiết bị, trạng thái..."
            className="flex-1 border-none outline-none bg-transparent text-[12px] text-foreground font-sans"
          />
          {search && (
            <button onClick={() => { setSearch(''); setAppliedSearch(''); setPage(1) }}
              className="bg-transparent border-none cursor-pointer text-muted text-sm p-0 leading-none">×</button>
          )}
        </div>

        {/* Cụm Select Filters */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Lọc Thiết bị */}
          <select 
            value={deviceFilter} 
            onChange={e => { setDeviceFilter(e.target.value); setPage(1) }}
            className="bg-card border border-border text-foreground text-[12px] rounded-lg px-3 py-2.5 outline-none cursor-pointer shadow-xs"
          >
            <option value="all">Tất cả thiết bị</option>
            <option value="Led 1">Led 1</option>
            <option value="Led 2">Led 2</option>
          </select>

          {/* Lọc Hành động */}
          <select 
            value={actionFilter} 
            onChange={e => { setActionFilter(e.target.value); setPage(1) }}
            className="bg-card border border-border text-foreground text-[12px] rounded-lg px-3 py-2.5 outline-none cursor-pointer shadow-xs"
          >
            <option value="all">Tất cả hành động</option>
            <option value="Bật">Bật (On)</option>
            <option value="Tắt">Tắt (Off)</option>
          </select>

          {/* Lọc Trạng thái */}
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="bg-card border border-border text-foreground text-[12px] rounded-lg px-3 py-2.5 outline-none cursor-pointer shadow-xs"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Thành công">Thành công</option>
            <option value="Đang xử lý">Đang xử lý</option>
            <option value="Thất bại">Thất bại</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-[--radius] shadow-sm overflow-hidden flex-1 flex flex-col mt-2">
        <div className="grid grid-cols-[72px_140px_1fr_140px_180px] bg-[#F5F7F9] border-b-2 border-border px-5">
          {(['ID', 'THIẾT BỊ', 'HÀNH ĐỘNG', 'TRẠNG THÁI'] as const).map((label, i) => (
             <div key={label} className={`py-3 text-[10px] font-bold text-muted tracking-[0.08em] ${i === 3 ? 'text-center' : 'text-left'}`}>
              {label}
            </div>
          ))}
          {/* THỜI GIAN — clickable sort */}
          <button
            onClick={() => { setSortAsc(v => !v); setPage(1) }}
            className="py-3 text-[10px] font-bold text-primary tracking-[0.08em] text-right bg-transparent border-none cursor-pointer flex items-center justify-end gap-1"
          >
            THỜI GIAN
            <span className="flex flex-col gap-0.5">
              <IconArrowUp active={sortAsc} />
              <IconArrowDown active={!sortAsc} />
            </span>
          </button>
        </div>

        {/* Rows */}
        {historyRows.length === 0 ? (
          <div className="py-[60px] px-5 flex flex-col items-center gap-3">
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c0cdd8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <div className="text-[13px] text-[#b0bec5]">Không tìm thấy lịch sử phù hợp</div>
            <div className="text-[11px] text-[#c0cdd8] font-mono">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</div>
          </div>
        ) : (
          historyRows.map((row, idx) => {
            // Sử dụng màu badge dựa theo Trạng thái thực tế từ CSDL
            const sm = STATUS_META[row.status] || { label: row.status, color: '#888', bg: '#eee' }
            const isHovered = hoveredRow === row.id
            const isActionOn = row.action === 'Bật'
            const timeFormat = new Date(row.datetime).toLocaleString('vi-VN')

            return (
              <div key={row.id}
                onMouseEnter={() => setHoveredRow(row.id)}
                onMouseLeave={() => setHoveredRow(null)}
                className={`grid grid-cols-[72px_140px_1fr_140px_180px] px-5 transition-colors duration-120 cursor-default ${
                  idx < historyRows.length - 1 ? 'border-b border-[#f0f4f8]' : ''
                } ${isHovered ? 'bg-[#f8fbff]' : 'bg-transparent'}`}
              >
                {/* ID */}
                <div className="py-3 flex items-center">
                  <span className="font-mono text-[11px] text-muted font-medium">#{row.id}</span>
                </div>

                {/* Device */}
                <div className="py-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0" style={{ background: isActionOn ? 'rgba(46,204,113,0.12)' : 'rgba(229,89,89,0.10)' }}>
                    <IconBulbHistory on={isActionOn} />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-foreground">{row.device}</div>
                    <div className="text-[10px] text-muted font-mono">Node #07</div>
                  </div>
                </div>

                {/* Action */}
                <div className="py-3 flex items-center gap-2">
                  {isActionOn ? <IconToggleOn /> : <IconToggleOff />}
                  <div>
                    <span className={`text-[12px] font-semibold ${isActionOn ? 'text-emerald' : 'text-coral'}`}>
                      {row.action} đèn
                    </span>
                    <span className="text-[11px] text-[#b0bec5] ml-1.5 font-mono">
                      via Dashboard
                    </span>
                  </div>
                </div>

                {/* Status badge */}
                <div className="py-3 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full tracking-[0.02em] border" style={{ background: sm.bg, color: sm.color, borderColor: `${sm.color}30` }}>
                    {row.status === 'Đang xử lý' ? (
                      <svg className="animate-spin w-2.5 h-2.5" style={{ color: sm.color }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <span className="w-1.25 h-1.25 rounded-full inline-block shrink-0" style={{ background: sm.color }} />
                    )}
                    {sm.label}
                  </span>
                </div>

                {/* Datetime */}
                <div className="py-3 flex items-center justify-end">
                  <span className="text-[11px] text-[#b0bec5] font-mono">{timeFormat}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <PaginationBar
        page={safePage}
        totalPages={totalPages}
        onPage={n => setPage(n)}
        countLabel={`Hiển thị trang ${safePage} / ${totalPages || 1}`}
        pageSize={pageSize}
        onPageSizeChange={size => { setPageSize(size); setPage(1); }}
      />
    </main>
  )
}