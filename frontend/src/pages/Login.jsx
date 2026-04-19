import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import crimeTapeBackground1 from '../../../images/true crime 7.jpg'
import crimeTapeBackground2 from '../../../images/true crime 6.jpg'
import crimeTapeBackground3 from '../../../images/true crime 3.png'
import crimeTapeBackground4 from '../../../images/true crimne 4.png'
import crimeTapeBackground5 from '../../../images/true crime.webp'

const POST_LOGIN_MESSAGE = `VOICE OF THE VOICELESS

Where silence ends and truth begins.

We stand for those who cannot speak,
we fight for those who are unheard,
and we shine light where darkness hides.

This platform empowers you to report incidents,
share real-time information, and connect to live updates that matter.

Every voice counts. Every report matters.

Speak. Report. Be Heard.`

const LOGIN_BACKGROUND_IMAGES = [
  crimeTapeBackground1,
  crimeTapeBackground2,
  crimeTapeBackground3,
  crimeTapeBackground4,
  crimeTapeBackground5,
]

const SLIDE_DURATION_MS = 5000

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading } = useAuth()

  const [form, setForm] = useState({ email: '', password: '', secretCode: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [adminMode, setAdminMode] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const [nextPath, setNextPath] = useState('/dashboard')
  const [activeBackgroundIndex, setActiveBackgroundIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBackgroundIndex((prev) => (prev + 1) % LOGIN_BACKGROUND_IMAGES.length)
    }, SLIDE_DURATION_MS)

    return () => clearInterval(timer)
  }, [])

  const continueToDestination = () => {
    setWelcomeOpen(false)
    toast.success('Welcome back!')
    navigate(nextPath, { replace: true })
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const result = await login(adminMode ? form : { email: form.email, password: form.password })
    if (!result.success) {
      if (result.message === 'Invalid admin secret code.' && !adminMode) {
        setAdminMode(true)
        toast.error('Admin sign-in requires a secret code. Admin mode has been enabled.')
        return
      }
      toast.error(result.message)
      return
    }

    const from = location.state?.from?.pathname
    const destination = from || (result.user?.role === 'admin' ? '/admin' : '/dashboard')
    setNextPath(destination)
    setWelcomeOpen(true)
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0">
        {LOGIN_BACKGROUND_IMAGES.map((image, index) => (
          <div
            key={image}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: index === activeBackgroundIndex ? 1 : 0,
              animation: index === activeBackgroundIndex ? 'loginKenBurns 5000ms ease-out forwards' : 'none',
              transition: 'opacity 1200ms ease-in-out',
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/84 via-slate-950/88 to-slate-950/94" />
        <div className="absolute inset-0 bg-slate-950/26" />
      </div>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-violet-500/25 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-sky-500/20 blur-3xl rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-amber-500/15 blur-3xl rounded-full" />
      </div>

      <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        {LOGIN_BACKGROUND_IMAGES.map((_, index) => (
          <span
            key={`bg-dot-${index}`}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              index === activeBackgroundIndex ? 'w-8 bg-amber-300/90' : 'w-2 bg-white/45'
            }`}
          />
        ))}
      </div>

      <section className="card p-6 w-full max-w-md relative border border-violet-500/30 bg-gradient-to-br from-slate-900/95 to-slate-800/90 shadow-2xl shadow-violet-900/30">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {adminMode ? 'Admin Sign In' : 'Sign In'}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {adminMode
                ? 'Administrator access — restricted area.'
                : 'Secure access to the civic incident platform.'}
            </p>
          </div>
          {adminMode && (
            <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center border border-violet-400/30">
              <ShieldCheck className="w-5 h-5 text-violet-300" />
            </div>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4 mt-5">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="label">Password</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((p) => !p)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Secret code — admin only */}
          {adminMode && (
            <div>
              <label className="label">Admin Secret Code</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showSecret ? 'text' : 'password'}
                  placeholder="Enter secret code"
                  value={form.secretCode}
                  onChange={(e) => setForm((p) => ({ ...p, secretCode: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowSecret((p) => !p)}
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Signing in…' : adminMode ? 'Admin Sign In' : 'Sign In'}
          </button>

          {!adminMode && (
            <p className="text-xs text-slate-300 text-right">
              <Link to="/forgot-password" className="text-violet-300 hover:text-violet-200">Forgot password?</Link>
            </p>
          )}

          <p className="text-xs text-slate-400">
            For admin access, switch to <span className="font-semibold">Admin Access</span> and enter your secret code.
            If sign-in fails due to a temporary server issue, please try again shortly.
          </p>
        </form>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-300">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-violet-300 hover:text-violet-200">Register</Link>
          </p>
          <button
            type="button"
            onClick={() => {
              setAdminMode((p) => !p)
              setForm({ email: '', password: '', secretCode: '' })
            }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
              adminMode
                ? 'bg-violet-500/20 text-violet-200 border border-violet-400/30'
                : 'text-slate-300 hover:text-violet-200 hover:bg-slate-700/60'
            }`}
          >
            {adminMode ? '← Standard Sign In' : 'Admin Access'}
          </button>
        </div>
      </section>

      <Modal
        open={welcomeOpen}
        onClose={continueToDestination}
        title="VOICE OF THE VOICELESS"
        size="md"
        footer={(
          <button
            type="button"
            onClick={continueToDestination}
            className="inline-flex items-center rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            Continue to Dashboard
          </button>
        )}
      >
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 p-5">
          {LOGIN_BACKGROUND_IMAGES.map((image, index) => (
            <div
              key={`welcome-bg-${index}`}
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: index === activeBackgroundIndex ? 1 : 0,
                animation: index === activeBackgroundIndex ? 'loginKenBurns 5000ms ease-out forwards' : 'none',
                transition: 'opacity 1000ms ease-in-out',
              }}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/94 via-slate-950/90 to-violet-950/86" />
          <div className="absolute inset-0 bg-black/20" />

          <div className="relative space-y-4">
            <p className="text-violet-100 font-semibold italic">Where silence ends and truth begins.</p>
            <p className="text-slate-200 leading-relaxed">
              We stand for those who cannot speak,<br />
              we fight for those who are unheard,<br />
              and we shine light where darkness hides.
            </p>
            <p className="text-slate-200 leading-relaxed">
              This platform empowers you to report incidents,
              share real-time information, and connect to live updates that matter.
            </p>
            <p className="text-slate-100 font-semibold">Every voice counts. Every report matters.</p>
            <p className="text-violet-200 font-bold tracking-wide">Speak. Report. Be Heard.</p>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes loginKenBurns {
          0% { transform: scale(1); }
          100% { transform: scale(1.06); }
        }
      `}</style>
    </main>
  )
}
