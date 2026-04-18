import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import {
  Sun, Moon, Monitor, Smartphone, Tablet, ExternalLink,
  Grid, List, ChevronRight, Star, Eye,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   All app pages / routes
───────────────────────────────────────────── */
const PAGES = [
  /* ── Public ── */
  {
    id: 'landing',
    label: 'Landing Page',
    route: '/',
    tag: 'Public',
    tagColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    description: 'Hero section, features, how-it-works, statistics & call-to-action.',
    starred: true,
  },
  {
    id: 'emergency',
    label: 'Emergency Directory',
    route: '/emergency',
    tag: 'Public',
    tagColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    description: 'Quick-access directory of emergency contacts and hotlines.',
  },
  /* ── Auth ── */
  {
    id: 'login',
    label: 'Login',
    route: '/login',
    tag: 'Auth',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    description: 'Split-screen sign-in with demo credentials hint.',
  },
  {
    id: 'register',
    label: 'Register',
    route: '/register',
    tag: 'Auth',
    tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    description: '2-step registration with ID document upload & drag-and-drop.',
    starred: true,
  },
  /* ── User ── */
  {
    id: 'user-dashboard',
    label: 'User Dashboard',
    route: '/dashboard',
    tag: 'User',
    tagColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    description: 'Report submission form, live video button, status-filtered report list.',
    starred: true,
  },
  {
    id: 'live-home',
    label: 'Live Streams Home',
    route: '/live',
    tag: 'User',
    tagColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    description: 'Browse active live crime-reporting streams.',
  },
  {
    id: 'live-streamer',
    label: 'Live Streamer',
    route: '/live/start',
    tag: 'User',
    tagColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    description: 'WebRTC live video streamer page for verified citizens.',
  },
  /* ── Admin ── */
  {
    id: 'admin-overview',
    label: 'Admin Overview',
    route: '/admin',
    tag: 'Admin',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    description: 'Stats cards, recent reports table and activity feed.',
    starred: true,
  },
  {
    id: 'admin-reports',
    label: 'Admin — Reports',
    route: '/admin/reports',
    tag: 'Admin',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    description: 'Filterable reports table with approve / reject actions & detail modal.',
    starred: true,
  },
  {
    id: 'admin-users',
    label: 'Admin — Users',
    route: '/admin/users',
    tag: 'Admin',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    description: 'User list with role, status, ID-verification info and action menus.',
  },
  {
    id: 'admin-verification',
    label: 'Admin — ID Verification',
    route: '/admin/verification',
    tag: 'Admin',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    description: 'Pending verification queue with document preview modals.',
    starred: true,
  },
  {
    id: 'admin-live',
    label: 'Admin — Live Viewer',
    route: '/admin/live',
    tag: 'Admin',
    tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    description: 'Admin interface for monitoring active live crime streams.',
  },
]

/* viewport sizes */
const VIEWPORTS = {
  desktop: { w: 1280, h: 800, label: 'Desktop', icon: Monitor, scale: 0.55 },
  tablet:  { w: 768,  h: 1024, label: 'Tablet',  icon: Tablet,  scale: 0.55 },
  mobile:  { w: 375,  h: 812,  label: 'Mobile',   icon: Smartphone, scale: 0.55 },
}

/* tag filter order */
const TAGS = ['All', 'Public', 'Auth', 'User', 'Admin']

export default function Preview() {
  const { isDark, toggle } = useTheme()
  const [selectedPage, setSelectedPage] = useState(PAGES[0])
  const [viewport, setViewport] = useState('desktop')
  const [tagFilter, setTagFilter] = useState('All')
  const [layout, setLayout] = useState('split')   // 'split' | 'gallery'
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  const vp = VIEWPORTS[viewport]

  const filtered = tagFilter === 'All'
    ? PAGES
    : PAGES.filter((p) => p.tag === tagFilter)

  const navigate = (page) => {
    setSelectedPage(page)
    setIframeLoaded(false)
    setIframeKey((k) => k + 1)
    if (layout === 'gallery') setLayout('split')
  }

  /* iframe rendered at native size then scaled with CSS transform */
  const scaledW = Math.round(vp.w * vp.scale)
  const scaledH = Math.round(vp.h * vp.scale)

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-50">

      {/* ══════════  TOP BAR  ══════════ */}
      <header className="sticky top-0 z-50 h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 px-4 sm:px-6 shadow-sm">
        {/* Brand */}
        <a href="/" className="flex items-center gap-2 shrink-0 mr-2">
          <img src="/logo.webp" alt="True Hero Crime Report Logo" className="h-7 w-auto object-contain" />
          <span className="text-sm font-extrabold text-slate-900 dark:text-white hidden sm:block">
            Crime<span className="text-indigo-600">Report</span>
          </span>
        </a>

        <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">Preview Gallery</span>

        <div className="flex-1" />

        {/* Viewport toggle */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {Object.entries(VIEWPORTS).map(([key, v]) => (
            <button
              key={key}
              onClick={() => setViewport(key)}
              title={v.label}
              className={`p-1.5 rounded-md transition-all ${viewport === key ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <v.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* Layout toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <button onClick={() => setLayout('split')} title="Split view" className={`p-1.5 rounded-md transition-all ${layout === 'split' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setLayout('gallery')} title="Gallery view" className={`p-1.5 rounded-md transition-all ${layout === 'gallery' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Theme */}
        <button
          onClick={toggle}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Open in new tab */}
        <a
          href={selectedPage.route}
          target="_blank"
          rel="noreferrer"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open Page
        </a>
      </header>

      {/* ══════════  BODY  ══════════ */}
      {layout === 'split' ? (
        <div className="flex flex-1 overflow-hidden">

          {/* ── Sidebar page list ── */}
          <aside className="w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Tag filter */}
            <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
              {TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${tagFilter === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Page list */}
            <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
              {filtered.map((page) => {
                const active = selectedPage.id === page.id
                return (
                  <button
                    key={page.id}
                    onClick={() => navigate(page)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-150 ${active ? 'bg-indigo-50 dark:bg-indigo-900/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-xs font-semibold truncate ${active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                        {page.label}
                      </span>
                      {page.starred && <Star className={`w-3 h-3 shrink-0 ${active ? 'text-indigo-400' : 'text-amber-400'}`} fill="currentColor" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${page.tagColor}`}>{page.tag}</span>
                      <span className="text-[10px] text-slate-400 font-mono truncate">{page.route}</span>
                    </div>
                  </button>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              {PAGES.length} pages · Vite dev server
            </div>
          </aside>

          {/* ── Preview area ── */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
            {/* Info bar */}
            <div className="h-11 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 px-5 shrink-0">
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-md px-3 py-1 max-w-sm">
                <span className="text-[11px] text-slate-400 font-mono truncate">localhost:5173{selectedPage.route}</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${selectedPage.tagColor}`}>{selectedPage.tag}</span>
              <span className="text-[11px] text-slate-400 ml-auto hidden md:block">{vp.label} · {vp.w}×{vp.h}</span>
            </div>

            {/* Viewport frame */}
            <div className="flex-1 flex items-center justify-center overflow-auto p-6">
              <div className="flex flex-col items-center gap-4">
                {/* Device chrome */}
                <div
                  className={`relative bg-white rounded-2xl overflow-hidden shadow-2xl border-4 ${viewport === 'mobile' ? 'border-slate-700 dark:border-slate-600 rounded-[2.5rem]' : viewport === 'tablet' ? 'border-slate-300 dark:border-slate-600' : 'border-slate-200 dark:border-slate-700'}`}
                  style={{ width: scaledW, height: scaledH }}
                >
                  {/* Loading overlay */}
                  {!iframeLoaded && (
                    <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-3 z-10">
                      <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-xs text-slate-400">Loading {selectedPage.label}…</p>
                    </div>
                  )}

                  {/* Mobile notch */}
                  {viewport === 'mobile' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-700 dark:bg-slate-600 rounded-b-xl z-20" />
                  )}

                  <iframe
                    key={`${iframeKey}-${viewport}`}
                    src={`http://localhost:5173${selectedPage.route}`}
                    title={selectedPage.label}
                    onLoad={() => setIframeLoaded(true)}
                    style={{
                      width: vp.w,
                      height: vp.h,
                      transform: `scale(${vp.scale})`,
                      transformOrigin: 'top left',
                      border: 'none',
                      pointerEvents: 'auto',
                    }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>

                {/* Caption */}
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{selectedPage.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-sm">{selectedPage.description}</p>
                </div>

                {/* Viewport switcher (mobile-accessible) */}
                <div className="flex items-center gap-2 sm:hidden">
                  {Object.entries(VIEWPORTS).map(([key, v]) => (
                    <button
                      key={key}
                      onClick={() => setViewport(key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewport === key ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500'}`}
                    >
                      <v.icon className="w-3.5 h-3.5" />{v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      ) : (
        /* ══════════  GALLERY VIEW  ══════════ */
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">All Pages Gallery</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Click any page to open full preview. Showing all {PAGES.length} routes.</p>
            </div>

            {/* Tag filter */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTagFilter(t)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${tagFilter === t ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filtered.map((page) => (
                <GalleryCard
                  key={page.id}
                  page={page}
                  onClick={() => navigate(page)}
                />
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  )
}

/* ── Gallery card ── */
function GalleryCard({ page, onClick }) {
  const [loaded, setLoaded] = useState(false)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:shadow-slate-900/8 transition-all duration-300 cursor-pointer hover:-translate-y-1"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Preview window */}
      <div className="relative bg-slate-100 dark:bg-slate-800 overflow-hidden" style={{ height: 220 }}>
        {/* Browser bar */}
        <div className="absolute top-0 left-0 right-0 h-7 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 px-3 z-10">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <div className="flex-1 mx-2 h-3.5 bg-slate-100 dark:bg-slate-700 rounded-sm" />
        </div>

        {/* Loading */}
        {!loaded && (
          <div className="absolute inset-0 top-7 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
            <svg className="w-6 h-6 animate-spin text-indigo-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}

        <iframe
          src={`http://localhost:5173${page.route}`}
          title={page.label}
          onLoad={() => setLoaded(true)}
          style={{
            position: 'absolute',
            top: 28,
            left: 0,
            width: 1280,
            height: 900,
            transform: 'scale(0.295)',
            transformOrigin: 'top left',
            border: 'none',
            pointerEvents: hovered ? 'none' : 'none',
          }}
          sandbox="allow-scripts allow-same-origin"
          tabIndex={-1}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 top-7 bg-indigo-600/0 group-hover:bg-indigo-600/5 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg">
            <Eye className="w-3.5 h-3.5" />
            Open Preview
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {page.label}
            </h3>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">{page.route}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {page.starred && <Star className="w-3.5 h-3.5 text-amber-400" fill="currentColor" />}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${page.tagColor}`}>{page.tag}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{page.description}</p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {[Monitor, Smartphone].map((Icon, i) => (
              <div key={i} className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <Icon className="w-3 h-3 text-slate-400" />
              </div>
            ))}
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
            View <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  )
}
