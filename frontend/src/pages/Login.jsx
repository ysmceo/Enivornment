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
      toast.error(result.message)
      return
    }

    toast.success('Welcome back!')
    const from = location.state?.from?.pathname
    if (from) navigate(from, { replace: true })
    else navigate(result.user?.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <section className="card p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {adminMode ? 'Admin Sign In' : 'Sign In'}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {adminMode
                ? 'Administrator access — restricted area.'
                : 'Secure access to the civic incident platform.'}
            </p>
          </div>
          {adminMode && (
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
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

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Tip: For admin access, switch to <span className="font-semibold">Admin?</span> mode and enter your secret code.
            If login still fails with server error, start MongoDB and restart backend.
          </p>
        </form>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-indigo-600">Register</Link>
          </p>
          <button
            type="button"
            onClick={() => {
              setAdminMode((p) => !p)
              setForm({ email: '', password: '', secretCode: '' })
            }}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
              adminMode
                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {adminMode ? '← Regular Login' : 'Admin?'}
          </button>
        </div>
      </section>
    </main>
  )
}
