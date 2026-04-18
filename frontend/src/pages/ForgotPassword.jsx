import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authService } from '../services/authService'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [devResetUrl, setDevResetUrl] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }

    try {
      setLoading(true)
      const { data } = await authService.forgotPassword({ email: email.trim() })
      setMessage(data?.message || 'If an account exists for this email, a reset link has been sent.')
      setDevResetUrl(data?.resetUrl || '')
      toast.success('Reset instructions sent')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-slate-950">
      <section className="card p-6 w-full max-w-md border border-violet-500/30 bg-gradient-to-br from-slate-900/95 to-slate-800/90 shadow-2xl shadow-violet-900/30 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Forgot Password</h1>
          <p className="text-sm text-slate-300 mt-1">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        {message && <p className="text-sm text-emerald-300">{message}</p>}

        {devResetUrl && (
          <p className="text-xs text-amber-300 break-all">
            Local mode reset URL: <a className="underline" href={devResetUrl}>{devResetUrl}</a>
          </p>
        )}

        <p className="text-sm text-slate-300">
          Back to <Link to="/login" className="text-violet-300 hover:text-violet-200">Sign In</Link>
        </p>
      </section>
    </main>
  )
}
