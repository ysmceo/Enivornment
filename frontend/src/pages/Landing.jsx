import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  Lock,
  MapPin,
  Shield,
  Siren,
  Video,
} from 'lucide-react'
import NewsSection from '../components/NewsSection'

const KPI_STATS = [
  { value: '102k', label: 'Trusted Citizens', tone: 'from-emerald-500/20 to-emerald-900/10 border-emerald-500/30', valueColor: 'text-emerald-200' },
  { value: '900M+', label: 'Evidence Data Secured', tone: 'from-sky-500/20 to-sky-900/10 border-sky-500/30', valueColor: 'text-sky-200' },
  { value: '124k', label: 'Incidents Processed', tone: 'from-violet-500/20 to-violet-900/10 border-violet-500/30', valueColor: 'text-violet-200' },
  { value: '99%', label: 'Successful Escalations', tone: 'from-amber-500/20 to-amber-900/10 border-amber-500/30', valueColor: 'text-amber-200' },
]

const CORE_FEATURES = [
  {
    icon: Shield,
    title: 'Anonymous Reporting',
    description: 'Safely report sensitive incidents without exposing your identity to the public.',
    iconTone: 'bg-emerald-500/20 text-emerald-300',
    borderTone: 'hover:border-emerald-500/50',
  },
  {
    icon: Lock,
    title: 'Military-grade Security',
    description: 'All evidence is encrypted in transit and at rest for trusted legal admissibility.',
    iconTone: 'bg-violet-500/20 text-violet-300',
    borderTone: 'hover:border-violet-500/50',
  },
  {
    icon: Video,
    title: 'Live Video Evidence',
    description: 'Stream real-time evidence when immediate intervention is required.',
    iconTone: 'bg-rose-500/20 text-rose-300',
    borderTone: 'hover:border-rose-500/50',
  },
  {
    icon: Bell,
    title: 'Case Status Alerts',
    description: 'Receive structured updates as reports move from intake to resolution.',
    iconTone: 'bg-sky-500/20 text-sky-300',
    borderTone: 'hover:border-sky-500/50',
  },
]

const OPERATIONS = [
  {
    title: 'Emergency Operations',
    subtitle: '24/7 incident escalation for severe threats and active emergencies.',
    points: ['Rapid alert routing', 'Geo-aware triage', 'Agency handoff'],
    tone: 'from-rose-500/15 to-transparent border-rose-500/25',
  },
  {
    title: 'Digital Evidence Desk',
    subtitle: 'Secure evidence intake, timeline validation, and integrity preservation.',
    points: ['Media chain of custody', 'Tamper detection', 'Investigation notes'],
    tone: 'from-violet-500/15 to-transparent border-violet-500/25',
  },
  {
    title: 'Community Safety Unit',
    subtitle: 'Pattern monitoring and preventive engagement across neighborhoods.',
    points: ['Hotspot trend analysis', 'Safety advisories', 'Local authority sync'],
    tone: 'from-emerald-500/15 to-transparent border-emerald-500/25',
  },
  {
    title: 'Crisis Coordination',
    subtitle: 'Multi-agency communication for disasters, unrest, and major disruptions.',
    points: ['Unified communication', 'Response dashboards', 'Cross-state escalation'],
    tone: 'from-sky-500/15 to-transparent border-sky-500/25',
  },
]

const PROCESS = [
  {
    step: '01',
    title: 'Send Your Report',
    description: 'Submit details, optional media, and location in under two minutes.',
    tone: 'bg-amber-500/15 text-amber-300',
  },
  {
    step: '02',
    title: 'Verification & Investigation',
    description: 'Our workflow validates context, prioritizes severity, and alerts responders.',
    tone: 'bg-violet-500/15 text-violet-300',
  },
  {
    step: '03',
    title: 'Coordinated Response',
    description: 'Agencies receive structured evidence with real-time updates for action.',
    tone: 'bg-emerald-500/15 text-emerald-300',
  },
]

const ABOUT_MISSION =
  'VOV CRIME is a community-driven public safety platform designed to help citizens report, track, and respond to criminal activity and environmental hazards in real time. Our mission is to strengthen public safety, support faster response from authorities, and give communities a trusted voice in protecting their neighborhoods.'

const TIMELINE = [
  {
    year: '2019',
    text: 'Platform launch with location-tagged reporting and evidence uploads for incidents such as theft, violence, flooding, pollution, and fire outbreaks.',
  },
  {
    year: '2022',
    text: 'Growing community trust through thousands of verified reports, anonymous reporting, and safety alerts that encouraged broader participation without fear.',
  },
  {
    year: '2026',
    text: 'Evolution into a smarter safety network with live incident mapping, AI-assisted report categorization, and admin response workflows that support faster intervention.',
  },
]

const ABOUT_HELP_POINTS = [
  'Fast, accessible incident reporting with evidence upload',
  'Real-time, location-based incident tracking',
  'Improved community awareness of nearby threats and hazards',
  'Anonymous reporting options to protect user safety',
  'Verified and structured incident data to assist authorities',
  'Faster response through structured alerts, including fire-related incidents',
]

const TESTIMONIALS = [
  {
    quote: 'The platform helped us receive reliable, timestamped evidence much faster.',
    author: 'Officer M. Yusuf',
    role: 'Public Safety Desk',
  },
  {
    quote: 'Anonymous reporting gave me confidence to submit critical information safely.',
    author: 'Amina K.',
    role: 'Citizen Reporter',
  },
  {
    quote: 'The escalation flow and alerts reduce delay during high-priority incidents.',
    author: 'Inspector Adaeze O.',
    role: 'Emergency Coordination Unit',
  },
]

const FOOTER_LINKS = {
  Platform: [
    { label: 'How it Works', to: '#process' },
    { label: 'Emergency Directory', to: '/emergency' },
    { label: 'News & Alerts', to: '#news' },
    { label: 'Live Streaming', to: '/live' },
  ],
  Operations: [
    { label: 'Incident Triage', to: '#operations' },
    { label: 'Evidence Workflow', to: '#process' },
    { label: 'Agency Access', to: '/login' },
    { label: 'Security Standards', to: '#features' },
  ],
  'Quick Access': [
    { label: 'Report Crime', to: '/register' },
    { label: 'Sign In', to: '/login' },
    { label: 'Create Account', to: '/register' },
    { label: 'Admin Dashboard', to: '/admin' },
  ],
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#12100d] text-slate-100 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-violet-500/15 blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 bg-sky-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-amber-500/10 blur-3xl rounded-full" />
      </div>

      <div className="bg-gradient-to-r from-[#0e0c09] via-[#13100b] to-[#0e0c09] text-[11px] sm:text-xs text-slate-300 border-b border-amber-800/30 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
          <p className="truncate">Secure civic intelligence for safer communities.</p>
          <Link to="/register" className="text-amber-300 hover:text-amber-200 font-semibold">Start Reporting</Link>
        </div>
      </div>

      <header className="sticky top-0 z-50 bg-[#12100d]/90 backdrop-blur-xl border-b border-amber-900/20">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-black tracking-tight text-sm sm:text-base text-amber-100">VOV CRIME</span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm">
            <a href="#home" className="text-slate-300 hover:text-amber-300">Home</a>
            <a href="#operations" className="text-slate-300 hover:text-amber-300">Operations</a>
            <a href="#process" className="text-slate-300 hover:text-amber-300">How It Works</a>
            <a href="#testimonials" className="text-slate-300 hover:text-amber-300">Testimonials</a>
            <a href="#contact" className="text-slate-300 hover:text-amber-300">Contact</a>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-secondary !bg-slate-900/80 !border-amber-800/40 !text-amber-100 hover:!bg-slate-800">Sign In</Link>
            <Link to="/register" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section id="home" className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,.72), rgba(0,0,0,.72)), url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=2000&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24 grid lg:grid-cols-[1.1fr_.9fr] gap-10 items-center">
          <div>
            <p className="inline-flex items-center rounded-full px-3 py-1 bg-amber-500/15 border border-amber-400/30 text-amber-200 text-xs font-semibold mb-4">Real-time Civic Protection Platform</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight max-w-2xl">
              Report Incidents,
              <br />
              Protect Communities,
              <br />
              <span className="bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 bg-clip-text text-transparent">Get Fast Response.</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg mt-6 max-w-xl leading-relaxed">
              A secure platform where citizens, responders, and agencies work together with verified evidence,
              rapid escalation, and structured incident workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 text-black font-bold hover:bg-amber-400">
                Submit Report <ChevronRight className="w-4 h-4" />
              </Link>
              <Link to="/live" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-700/50 text-amber-100 hover:bg-amber-900/20">
                Start Live Stream
              </Link>
            </div>

            <div className="mt-7 grid sm:grid-cols-2 gap-2.5 max-w-lg">
              {['Anonymous reporting', 'Live evidence support', 'Encrypted media storage', 'Agency-ready output'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-amber-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#18140f] to-[#151c2b] border border-amber-800/30 p-6 shadow-xl shadow-black/40">
            <p className="text-xs uppercase tracking-wide text-amber-300 mb-3">Command Snapshot</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Open Alerts', value: '48' },
                { label: 'Active Streams', value: '12' },
                { label: 'Escalated Today', value: '31' },
                { label: 'Avg Dispatch', value: '3.2m' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-amber-900/30 bg-black/25 backdrop-blur p-3">
                  <p className="text-2xl font-black text-amber-200">{item.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-sky-900/30 bg-black/25 p-3 space-y-2 text-sm">
              <p className="flex items-center gap-2 text-slate-300"><MapPin className="w-4 h-4 text-amber-300" /> Geo-tracked evidence pipeline is active.</p>
              <p className="flex items-center gap-2 text-slate-300"><Clock3 className="w-4 h-4 text-sky-300" /> Last sync: 20 seconds ago.</p>
              <p className="flex items-center gap-2 text-slate-300"><Siren className="w-4 h-4 text-rose-300" /> Emergency escalation route verified.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-8 border-y border-amber-900/20 bg-[#15110c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_STATS.map((item) => (
            <div key={item.label} className={`rounded-xl border bg-gradient-to-br px-4 py-5 text-center ${item.tone}`}>
              <p className={`text-3xl font-black ${item.valueColor}`}>{item.value}</p>
              <p className="text-sm text-slate-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
          <div className="rounded-2xl border border-amber-800/30 bg-[#19140f] p-6 lg:p-8">
            <p className="text-xs uppercase tracking-wide text-amber-300">Platform Confidence</p>
            <h2 className="text-3xl sm:text-4xl font-black mt-3">Professionals work with reliable data.</h2>
            <p className="mt-4 text-slate-300 leading-relaxed">
              Our system is built for practical response teams: structured intake, clear evidence trails,
              and secure communication channels from citizen to command center.
            </p>

            <div className="mt-6 grid sm:grid-cols-2 gap-3 text-sm">
              {[
                'Verified response workflows',
                'Geo-intelligent triage',
                'Role-based admin controls',
                'Cross-agency visibility',
                'Audit-friendly timelines',
                'Professional support operations',
              ].map((point) => (
                <div key={point} className="flex items-center gap-2 text-slate-300">
                  <Check className="w-4 h-4 text-amber-300" />
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {CORE_FEATURES.map((feature) => (
              <article key={feature.title} className={`rounded-2xl border border-amber-900/25 bg-[#15110c] p-5 transition-colors ${feature.borderTone}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${feature.iconTone}`}>
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-amber-100">{feature.title}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="operations" className="py-20 bg-[#15110c] border-y border-amber-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-amber-300 font-semibold">Operational Areas</p>
          <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-10">Built for mission-critical civic response.</h2>

          <div className="grid lg:grid-cols-2 gap-5">
            {OPERATIONS.map((area) => (
              <article key={area.title} className={`rounded-2xl border bg-gradient-to-br ${area.tone} p-6`}>
                <h3 className="text-xl font-bold text-amber-100">{area.title}</h3>
                <p className="text-sm text-slate-400 mt-2 mb-4">{area.subtitle}</p>
                <ul className="space-y-2 text-sm text-slate-300">
                  {area.points.map((point) => (
                    <li key={point} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-amber-300" />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="process" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-amber-300 font-semibold">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-6">Simple workflow. Serious outcomes.</h2>
            <div className="space-y-3">
              {PROCESS.map((step) => (
                <div key={step.step} className="rounded-xl border border-amber-900/25 bg-[#17120d] p-4 flex gap-4">
                  <div className={`w-11 h-11 rounded-lg font-black grid place-items-center ${step.tone}`}>{step.step}</div>
                  <div>
                    <h3 className="font-bold text-amber-100">{step.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-900/30 bg-[#18140f] p-6 lg:p-8">
            <p className="text-sm text-amber-300 font-semibold">About the Platform</p>
            <h3 className="text-2xl font-black mt-2">Our Mission</h3>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">{ABOUT_MISSION}</p>

            <h4 className="text-base font-bold mt-6 text-amber-100">Our Journey</h4>
            <div className="mt-6 space-y-4">
              {TIMELINE.map((item) => (
                <div key={item.year} className="flex gap-3">
                  <div className="w-16 shrink-0 text-sm font-bold text-amber-200">{item.year}</div>
                  <div className="text-sm text-slate-300 leading-relaxed border-l border-amber-900/40 pl-3">{item.text}</div>
                </div>
              ))}
            </div>

            <h4 className="text-base font-bold mt-6 text-amber-100">How We Help</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {ABOUT_HELP_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-amber-300" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 text-black px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between shadow-xl shadow-orange-900/30">
            <div>
              <h3 className="text-xl sm:text-2xl font-black">Request emergency support and coordination.</h3>
              <p className="text-sm sm:text-base text-black/80 mt-1">Immediate support for active incidents and high-risk reports.</p>
            </div>
            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-black text-amber-300 font-bold hover:bg-slate-900">
              Create Account <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-amber-300 font-semibold">Community Feedback</p>
          <h2 className="text-3xl sm:text-4xl font-black mt-2 mb-8">What teams say about VOV CRIME.</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t) => (
              <article key={t.author} className="rounded-2xl border border-amber-900/25 bg-gradient-to-br from-[#17120d] to-[#182131] p-6">
                <p className="text-sm text-slate-300 leading-relaxed">“{t.quote}”</p>
                <div className="mt-5 pt-4 border-t border-amber-900/30">
                  <p className="font-bold text-amber-100">{t.author}</p>
                  <p className="text-xs text-slate-400">{t.role}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="news">
        <NewsSection />
      </section>

      <footer id="contact" className="pt-14 pb-8 border-t border-amber-900/20 bg-[#0f0c08]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-4 gap-8">
          <div>
            <h4 className="font-black text-amber-100 mb-3">VOV CRIME</h4>
            <p className="text-sm text-slate-400 leading-relaxed">
              Strengthening public safety with secure reporting, professional workflows, and trusted collaboration.
            </p>
            <div className="mt-4 space-y-1 text-sm text-slate-300">
              <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-300" /> Civic Response Command</p>
              <p>Call us: +2347036939125</p>
              <p>Email: okntaysm@gmail.com</p>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h5 className="font-bold text-amber-100 mb-3">{title}</h5>
              <ul className="space-y-2 text-sm">
                {links.map((item) => (
                  <li key={item.label}>
                    <a href={item.to} className="text-slate-400 hover:text-amber-300 inline-flex items-center gap-2">
                      <ChevronRight className="w-3.5 h-3.5" />
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-4 border-t border-amber-900/20 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between text-xs text-slate-500">
          <p>© 2026 VOV CRIME. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-amber-300">Privacy Policy</a>
            <a href="#" className="hover:text-amber-300">Terms</a>
            <a href="#" className="hover:text-amber-300">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
