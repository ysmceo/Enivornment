import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Shield, Video, Lock, MapPin, Bell, BarChart3,
  ChevronRight, CheckCircle, Menu, X, Sun, Moon,
  ArrowRight, CloudSun, CalendarDays, Clock3,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import NewsSection from '../components/NewsSection'

const FEATURES = [
  {
    icon: Shield,
    title: 'Anonymous Reporting',
    description: 'Submit reports without revealing your identity. Your safety and privacy are our top priority at every step.',
    color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30',
  },
  {
    icon: Video,
    title: 'Live Video Evidence',
    description: 'Stream live video directly to law enforcement for real-time evidence capture that cannot be tampered with.',
    color: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All reports and media are encrypted using AES-256, both in transit and at rest — bank-grade security.',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  },
  {
    icon: MapPin,
    title: 'Precise Geolocation',
    description: 'Accurate location data helps first responders reach the scene faster and coordinate efficiently.',
    color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30',
  },
  {
    icon: Bell,
    title: 'Real-time Updates',
    description: 'Track your report status with instant push notifications at every stage of the investigation.',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  },
  {
    icon: BarChart3,
    title: 'Analytics Dashboard',
    description: 'Authorities get powerful analytics to identify crime patterns, allocate resources, and prevent future crimes.',
    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
  },
]

const STEPS = [
  { step: '01', title: 'Create Account', desc: 'Register securely with your ID for verified reporting, or choose anonymous mode.' },
  { step: '02', title: 'Submit Report', desc: 'Fill in incident details, attach photos or videos, and pin your location.' },
  { step: '03', title: 'Track Progress', desc: 'Get real-time updates as authorities review and act on your report.' },
]

const STATS = [
  { value: '48,200+', label: 'Reports Submitted' },
  { value: '94%', label: 'Resolution Rate' },
  { value: '3.2 min', label: 'Avg Response Time' },
  { value: '150+', label: 'Partner Agencies' },
]

const TRUST = ['End-to-End Encrypted', 'Anonymous Reporting', 'GDPR Compliant', '99.9% Uptime']

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80',  // city skyline at night
  'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1920&q=80',  // aerial city night
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',  // security camera / CCTV
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1920&q=80',  // night street
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1920&q=80',  // urban environment
]

export default function Landing() {
  const { isDark, toggle } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [bgIndex, setBgIndex] = useState(0)
  const [now, setNow] = useState(new Date())
  const [weather, setWeather] = useState({
    temp: null,
    wind: null,
    code: null,
    location: 'Abuja',
    loading: true,
  })

  const NAV_LINKS = [
    ['#home', 'Home'],
    ['#stats', 'About'],
    ['#features', 'Services'],
    ['#how-it-works', 'More'],
    ['#testimonials', 'Testimonials'],
    ['#contact', 'Contact'],
  ]

  useEffect(() => {
    const id = setInterval(() => setBgIndex((i) => (i + 1) % BG_IMAGES.length), 5000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const clockId = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(clockId)
  }, [])

  useEffect(() => {
    const fetchWeather = async (lat, lon, locationLabel) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m`)
        const data = await res.json()
        setWeather({
          temp: data?.current?.temperature_2m ?? null,
          wind: data?.current?.wind_speed_10m ?? null,
          code: data?.current?.weather_code ?? null,
          location: locationLabel,
          loading: false,
        })
      } catch {
        setWeather((prev) => ({ ...prev, loading: false }))
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, 'Your Area'),
        () => fetchWeather(9.0765, 7.3986, 'Abuja'),
        { timeout: 8000 }
      )
    } else {
      fetchWeather(9.0765, 7.3986, 'Abuja')
    }
  }, [])

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-50 font-sans">

      {/* ─── Animated background slideshow ─── */}
      {BG_IMAGES.map((src, i) => (
        <div
          key={src}
          aria-hidden="true"
          style={{
            backgroundImage: `linear-gradient(rgba(2,6,23,0.70),rgba(2,6,23,0.70)),url(${src})`,
            opacity: i === bgIndex ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
          }}
          className="fixed inset-0 -z-10 bg-cover bg-center"
        />
      ))}

      {/* Progress dots */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2">
        {BG_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setBgIndex(i)}
            aria-label={`Background ${i + 1}`}
            className="rounded-full transition-all duration-500 focus:outline-none"
            style={{
              width: i === bgIndex ? 24 : 8,
              height: 8,
              background: i === bgIndex ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
            }}
          />
        ))}
      </div>

      {/* ─── Navbar ─── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.webp" alt="True Hero Crime Report Logo" className="h-10 w-auto object-contain" />
            <span className="text-base font-extrabold text-slate-900 dark:text-white">
              TRUE <span className="text-indigo-600">HERO</span> CRIME REPORT
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} className="text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium">
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2.5">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Toggle theme">
              {isDark ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
            </button>
            <Link to="/login" className="btn-secondary text-sm px-4 py-2">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>

          <div className="flex md:hidden items-center gap-1.5">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              {isDark ? <Sun className="w-4 h-4 text-slate-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button onClick={() => setMobileOpen((p) => !p)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-2 animate-slide-up">
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600">
                {label}
              </a>
            ))}
            <div className="pt-2 flex flex-col gap-2">
              <Link to="/login" className="btn-secondary w-full" onClick={() => setMobileOpen(false)}>Sign In</Link>
              <Link to="/register" className="btn-primary w-full" onClick={() => setMobileOpen(false)}>Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ─── Hero ─── */}
      <section id="home" className="relative overflow-hidden pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-indigo-200/30 dark:from-indigo-500/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-full text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-7">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            Trusted by 150+ law enforcement agencies worldwide
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Report Crimes{' '}
            <span className="bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-600 bg-clip-text text-transparent">
              Securely.
            </span>
            <br />
            Stay Anonymous.
          </h1>

          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            A modern, encrypted platform that empowers citizens to report crimes safely
            while giving law enforcement the evidence they need.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-base px-8 py-3.5 rounded-2xl shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30">
              Submit a Report <ChevronRight className="w-4 h-4" />
            </Link>
            <Link to="/admin" className="btn-secondary text-base px-8 py-3.5 rounded-2xl">
              Admin Dashboard
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-2.5">
            {TRUST.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
            <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700/70 backdrop-blur rounded-2xl p-4 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-2">
                <CalendarDays className="w-4 h-4" /> Date & Time
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                <Clock3 className="w-4 h-4 text-indigo-500" />
                {now.toLocaleTimeString()}
              </p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-700/70 backdrop-blur rounded-2xl p-4 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300 mb-2">
                <CloudSun className="w-4 h-4" /> Weather Report
              </div>
              {weather.loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading weather…</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{weather.location}</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{weather.temp ?? '--'}°C</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Wind: {weather.wind ?? '--'} km/h · Code: {weather.code ?? '--'}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Dashboard Preview Mockup ── */}
        <div className="mt-20 max-w-5xl mx-auto">
          <div className="relative rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-900/10 overflow-hidden">
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 h-5 max-w-xs mx-auto bg-slate-200 dark:bg-slate-700 rounded-md" />
            </div>

            {/* Mock UI */}
            <div className="bg-slate-50 dark:bg-slate-900 p-6">
              <div className="grid grid-cols-4 gap-4 mb-5">
                {[
                  { label: 'Total Reports', value: '1,284', bar: 'bg-indigo-500' },
                  { label: 'Pending', value: '48', bar: 'bg-amber-500' },
                  { label: 'Resolved', value: '1,019', bar: 'bg-emerald-500' },
                  { label: 'Rejected', value: '217', bar: 'bg-red-500' },
                ].map((s) => (
                  <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className={`w-10 h-1.5 rounded-full ${s.bar} mb-3`} />
                    <div className="text-xl font-bold text-slate-900 dark:text-white">{s.value}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recent Reports</span>
                  <div className="flex gap-1.5">
                    {['All', 'Pending', 'Active'].map((f, i) => (
                      <span key={f} className={`text-xs px-3 py-1 rounded-lg font-medium ${i === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>{f}</span>
                    ))}
                  </div>
                </div>
                {[
                  { type: 'Armed Robbery', loc: 'Downtown', status: 'Pending', c: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
                  { type: 'Vandalism', loc: 'West Side', status: 'Under Review', c: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                  { type: 'Assault', loc: 'North Park', status: 'Approved', c: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
                ].map((row, i) => (
                  <div key={i} className="flex items-center px-4 py-3.5 border-t border-slate-100 dark:border-slate-700/60 text-sm">
                    <div className="flex-1 font-medium text-slate-800 dark:text-slate-100">{row.type}</div>
                    <div className="w-28 text-slate-400 dark:text-slate-500 text-xs">{row.loc}</div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${row.c}`}>{row.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white/75 dark:bg-slate-900/40 backdrop-blur">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">Testimonials</h2>
            <p className="text-slate-600 dark:text-slate-400 mt-3">What citizens and responders say about the platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { name: 'Amina K.', quote: 'Reporting felt safe and easy. I got updates almost immediately.' },
              { name: 'Officer Danladi', quote: 'The evidence quality and timestamps help us respond faster.' },
              { name: 'Efe O.', quote: 'Anonymous mode gave me confidence to report what I witnessed.' },
            ].map((t) => (
              <div key={t.name} className="card p-6">
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">“{t.quote}”</p>
                <p className="mt-4 text-sm font-semibold text-indigo-600 dark:text-indigo-300">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <NewsSection />

      {/* ─── Stats ─── */}
      <section id="stats" className="py-16 bg-gradient-to-r from-indigo-600 to-violet-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-10">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-4xl font-extrabold text-white mb-1.5 tracking-tight">{s.value}</div>
              <div className="text-indigo-200 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-semibold mb-4 border border-indigo-100 dark:border-indigo-800">
              Features
            </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Everything You Need to Report Safely</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Built with cutting-edge security and privacy technology to protect reporters while empowering law enforcement.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 hover:shadow-lg hover:shadow-slate-900/5 transition-all duration-200 group">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-200 ${f.color}`}>
                  <f.icon className="w-5.5 h-5.5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 bg-slate-50 dark:bg-slate-800/30 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-sm font-semibold mb-4 border border-indigo-100 dark:border-indigo-800">
              How It Works
            </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white">Three Steps to Safer Communities</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.step} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px border-t-2 border-dashed border-slate-300 dark:border-slate-600" />
                )}
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md border border-slate-200 dark:border-slate-700">
                  <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{s.step}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 p-12 text-center shadow-2xl shadow-indigo-500/20">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <h2 className="text-4xl font-extrabold text-white mb-4">Ready to Make Your Community Safer?</h2>
              <p className="text-indigo-200 text-lg mb-8">
                Join thousands of citizens helping build safer neighborhoods — anonymously and securely.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="px-8 py-3.5 bg-white text-indigo-700 font-bold rounded-2xl hover:bg-indigo-50 transition-colors shadow-lg">
                  Get Started Free
                </Link>
                <Link to="/login" className="px-8 py-3.5 border-2 border-indigo-400/60 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="contact" className="border-t border-slate-200 dark:border-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src="/logo.webp" alt="True Hero Crime Report Logo" className="h-8 w-auto object-contain" />
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              TRUE <span className="text-indigo-600">HERO</span> CRIME REPORT
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">© 2026 TRUE HERO CRIME REPORT. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-slate-500 dark:text-slate-400">
            {['Privacy Policy', 'Terms of Service', 'Contact'].map((l) => (
              <a key={l} href="#" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
