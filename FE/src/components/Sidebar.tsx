import {
  IconDashboard, IconData, IconHistory, IconProfile, IconWifi
} from './Icons'

export default function Sidebar({ activeNav, setActiveNav }: { activeNav: string; setActiveNav: (v: string) => void }) {
  const navItems = [
    { label: 'Dashboard', Icon: IconDashboard },
    { label: 'Data Sensor', Icon: IconData },
    { label: 'History', Icon: IconHistory },
    { label: 'Profile', Icon: IconProfile },
  ]

  return (
    <aside className="w-[180px] shrink-0 bg-sidebar flex flex-col pb-6 shadow-[2px_0_12px_rgba(0,0,0,0.12)]">
      {/* Logo Area */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div>
            <div className="text-sidebar-foreground text-xs font-bold tracking-[0.04em]">SensorIQ</div>
            <div className="text-[#7baec0] text-[9px] tracking-[0.08em] font-mono">IoT MONITOR</div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="px-5 py-2.5">
        <div className="flex items-center gap-1.5 bg-emerald/10 rounded-md px-2.5 py-1.5">
          <IconWifi />
          <span className="text-emerald text-[10px] font-mono font-semibold">CONNECTED</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="px-2.5 py-2 flex-1">
        {navItems.map(({ label, Icon }) => {
          const active = activeNav === label
          return (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg border-none cursor-pointer mb-0.5 transition-colors duration-150 ${
                active ? 'bg-primary/15' : 'bg-transparent hover:bg-white/5'
              }`}
            >
              <Icon active={active} />
              <span className={`text-[13px] tracking-[0.01em] ${
                active ? 'font-semibold text-primary' : 'font-normal text-[#a0c4d4]'
              }`}>
                {label}
              </span>
              {active && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
            </button>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-5 border-t border-white/10 pt-4">
        <div className="text-[10px] text-[#4a7a8a] font-mono tracking-[0.04em]">
          v2.4.1 · Node #07
        </div>
      </div>
    </aside>
  )
}