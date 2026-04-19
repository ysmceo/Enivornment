import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading } = useAuth()

  const [form, setForm] = useState({ email: '', password: '', secretCode: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [adminMode, setAdminMode] = useState(false)

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

    toast.success('Welcome back!')
    const from = location.state?.from?.pathname
    if (from) navigate(from, { replace: true })
    else navigate(result.user?.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 relative overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-violet-500/25 blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-sky-500/20 blur-3xl rounded-full" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-amber-500/15 blur-3xl rounded-full" />
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
    </main>
  )
}
