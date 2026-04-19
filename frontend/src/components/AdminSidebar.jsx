import { Link, useLocation } from 'react-router-dom'
import {
  Shield,
  LayoutDashboard,
  FileText,
  Users,
  BadgeCheck,
  Phone,
  Video,
  LogOut,
  ChevronLeft,
} from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, to: '/admin' },
  { label: 'Reports', icon: FileText, to: '/admin/reports' },
  { label: 'Users', icon: Users, to: '/admin/users' },
  { label: 'ID Verification', icon: BadgeCheck, to: '/admin/verification' },
  { label: 'Emergency Directory', icon: Phone, to: '/admin/emergency-contacts' },
  { label: 'Start Live', icon: Video, to: '/live/start' },
  { label: 'Live Monitor', icon: Video, to: '/admin/live' },
]

export default function AdminSidebar() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`flex flex-col h-screen bg-gradient-to-b from-white to-indigo-50/50 dark:from-slate-900 dark:to-indigo-950/20 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center h-16 px-4 border-b border-slate-200 dark:border-slate-800 ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
          <Shield className="w-4.5 h-4.5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">
            VOV <span className="text-indigo-600">CRIME</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, icon: Icon, to }) => {
          const active = pathname === to || (to !== '/admin' && pathname.startsWith(to))
          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={`sidebar-link ${active ? 'sidebar-link-active ring-1 ring-indigo-300/50 dark:ring-indigo-700/50' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon className="w-4.5 h-4.5 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        <Link
          to="/login"
          className={`sidebar-link text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </Link>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className={`sidebar-link w-full ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <ChevronLeft className={`w-4 h-4 shrink-0 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}
