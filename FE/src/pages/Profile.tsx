import { useState, useEffect } from 'react'
import axios from 'axios'
import { IconBadge, IconCamera, IconCheckCircle } from '../components/Icons'

const AVATAR_URL = 'https://images.unsplash.com/photo-1513002749550-c59d786b8e6c?w=160&h=160&fit=crop&auto=format'

function EditableField({
  label, value, onChange, icon, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void
  icon: React.ReactNode; placeholder?: string; type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold text-[#b0bec5] tracking-[0.07em] uppercase">{label}</span>
      </div>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`text-[13px] font-semibold text-foreground rounded-lg px-2.5 py-2 outline-none font-sans transition-all w-full box-border border-[1.5px] ${
          focused ? 'bg-card border-primary shadow-[0_0_0_3px_rgba(0,188,212,0.1)]' : 'bg-[#F5F7F9] border-border'
        }`}
      />
    </div>
  )
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true)
  
  const [avatarSrc, setAvatarSrc] = useState(AVATAR_URL)
  const [name, setName]     = useState('')
  const [msv, setMsv]       = useState('')
  const [figma, setFigma]   = useState('')
  const [github, setGithub] = useState('')
  const [postman, setPostman] = useState('')
  const [docLink, setDocLink] = useState('')

  const [avatarHover, setAvatarHover] = useState(false)
  const [saved, setSaved] = useState({ name: '', msv: '', figma: '', github: '', postman: '', docLink: '', avatar: '' })
  
  const infoChanged = name !== saved.name || msv !== saved.msv || 
                      figma !== saved.figma || github !== saved.github || 
                      postman !== saved.postman || docLink !== saved.docLink ||
                      avatarSrc !== saved.avatar

  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  // Gọi API lấy dữ liệu từ DB lúc vừa mở trang
  useEffect(() => {
    axios.get('http://localhost:3000/api/profile')
      .then(res => {
        const data = res.data.data
        if (data) {
          setName(data.HoTen || '')
          setMsv(data.MaSinhVien || '')
          setFigma(data.LinkFigma || '')
          setGithub(data.LinkGithub || '')
          setPostman(data.LinkPostman || '')
          setDocLink(data.LinkDoc || '')
          setAvatarSrc(data.Avatar || AVATAR_URL)
          
          setSaved({ 
            name: data.HoTen || '', msv: data.MaSinhVien || '', 
            figma: data.LinkFigma || '', github: data.LinkGithub || '', 
            postman: data.LinkPostman || '', docLink: data.LinkDoc || '', 
            avatar: data.Avatar || AVATAR_URL 
          })
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error("Lỗi tải profile:", err)
        setIsLoading(false)
      })
  }, [])

  // Gọi API PUT để lưu dữ liệu xuống DB
  async function handleSaveProfile() {
    try {
      await axios.put('http://localhost:3000/api/profile', {
        name, msv, figma, github, postman, docLink, avatar: avatarSrc
      })
      setSaved({ name, msv, figma, github, postman, docLink, avatar: avatarSrc })
      showToast('Thông tin đã được lưu vào Cơ sở dữ liệu')
    } catch (error) {
      console.error("Lỗi khi lưu profile", error)
      showToast('Có lỗi xảy ra khi lưu')
    }
  }

  function handleAvatarClick() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setAvatarSrc(base64String)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  if (isLoading) {
    return <main className="flex-1 p-[24px_28px] flex items-center justify-center text-muted text-sm">Đang tải hồ sơ...</main>
  }

  return (
    <main className="flex-1 p-[24px_28px] overflow-auto flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="m-0 text-[20px] font-bold text-foreground tracking-tight">Profile</h1>
        <p className="m-[2px_0_0] text-[12px] text-muted font-mono">
          Thông tin cá nhân và liên kết dự án
        </p>
      </div>

      {/* ── Personal info card ── */}
      <div className="bg-card rounded-[--radius] shadow-sm p-6">
        <div className="flex gap-7 items-start">
          
          {/* Avatar — clickable upload */}
          <div className="shrink-0 relative w-24 h-24">
            <div
              onClick={handleAvatarClick}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}
              className="relative w-24 h-24 rounded-full cursor-pointer"
            >
              <img
                src={avatarSrc}
                alt="Ảnh đại diện"
                className={`w-24 h-24 rounded-full object-cover block transition-colors duration-150 border-[2.5px] ${
                  avatarHover ? 'border-[#0097A7]' : 'border-primary'
                }`}
              />
              {/* Hover overlay */}
              <div className={`absolute inset-0 rounded-full bg-black/35 flex flex-col items-center justify-center gap-0.5 transition-opacity duration-180 pointer-events-none ${
                avatarHover ? 'opacity-100' : 'opacity-0'
              }`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-[9px] text-white font-semibold tracking-[0.04em]">Tải ảnh</span>
              </div>
            </div>
            {/* Camera badge */}
            <div className={`absolute bottom-0.5 right-0.5 w-[26px] h-[26px] rounded-full bg-card flex items-center justify-center pointer-events-none shadow-sm border-[1.5px] transition-colors ${
              avatarHover ? 'border-primary' : 'border-border'
            }`}>
              <IconCamera />
            </div>
          </div>

          {/* Info fields — all editable */}
          <div className="flex-1 flex flex-col gap-4">
            {/* Name full-width */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <span className="text-[10px] font-bold text-[#b0bec5] tracking-[0.08em] uppercase">Họ và tên</span>
              </div>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                className="text-[16px] font-bold text-foreground tracking-[-0.01em] bg-[#F5F7F9] border-[1.5px] border-border rounded-lg px-3 py-1.5 outline-none font-sans transition-all w-full box-border focus:border-primary focus:bg-card focus:shadow-[0_0_0_3px_rgba(0,188,212,0.1)]"
              />
            </div>

            {/* Grid: MSV / Figma / Github / Postman / Docs */}
            <div className="grid grid-cols-3 gap-x-5 gap-y-4">
              <EditableField
                label="Mã sinh viên" value={msv} onChange={setMsv}
                icon={<IconBadge />} placeholder="BxxDCCNxxx"
              />
              <EditableField
                label="Link Figma" value={figma} onChange={setFigma}
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5z"/><path d="M12 2h3.5a3.5 3.5 0 1 1 0 7H12V2z"/><path d="M12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0z"/><path d="M5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0z"/><path d="M5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z"/></svg>
                } placeholder="Dán link Figma..."
              />
              <EditableField
                label="Link GitHub" value={github} onChange={setGithub}
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                } placeholder="Dán link GitHub..."
              />
              <EditableField
                label="Link Postman" value={postman} onChange={setPostman}
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                } placeholder="Dán link Postman..."
              />
              <EditableField
                label="Link Tài Liệu" value={docLink} onChange={setDocLink}
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a9ab0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                } placeholder="Dán link tài liệu..."
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end mt-5 pt-5 border-t border-border">
          <button
            onClick={handleSaveProfile}
            disabled={!infoChanged}
            className={`px-6 py-2.5 rounded-full text-[13px] font-semibold font-sans transition-all ${
              infoChanged ? 'bg-primary text-white cursor-pointer shadow-md shadow-primary/30 border-none' : 'bg-border text-[#b0bec5] cursor-default border-none'
            }`}
          >
            Lưu thay đổi
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-7 right-7 z-[100] flex items-center gap-2.5 bg-sidebar text-white px-4.5 py-3 rounded-xl shadow-xl text-[13px] font-medium animate-[slideUp_0.25s_ease]">
          <IconCheckCircle />
          {toast}
        </div>
      )}
    </main>
  )
}