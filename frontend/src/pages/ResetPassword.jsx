import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authService } from '../services/authService'

const getPasswordStrength = (password) => {
  const value = String(password || '')
  let score = 0

  if (value.length >= 8) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/\d/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  if (score <= 1) {
    return {
      label: 'Weak',
      barClass: 'bg-rose-500',
      textClass: 'text-rose-300',
      width: '25%',
    }
  }

  if (score === 2) {
    return {
      label: 'Fair',
      barClass: 'bg-amber-500',
      textClass: 'text-amber-300',
      width: '50%',
    }
  }

  if (score === 3) {
    return {
      label: 'Good',
      barClass: 'bg-sky-500',
      textClass: 'text-sky-300',
      width: '75%',
    }
  }

  return {
    label: 'Strong',
    barClass: 'bg-emerald-500',
    textClass: 'text-emerald-300',
    width: '100%',
  }
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => searchParams.get('token') || '', [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const passwordStrength = useMemo(() => getPasswordStrength(newPassword), [newPassword])

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!token) {
      toast.error('Reset token is missing from URL')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setLoading(true)
      const { data } = await authService.resetPassword({ token, newPassword })
      toast.success(data?.message || 'Password reset successful')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 bg-slate-950">
      <section className="card p-6 w-full max-w-md border border-violet-500/30 bg-gradient-to-br from-slate-900/95 to-slate-800/90 shadow-2xl shadow-violet-900/30 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-sm text-slate-300 mt-1">Set your new password to regain account access.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <div className="mt-2 space-y-2">
              <div className="h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                <div className={`h-full transition-all duration-300 ${passwordStrength.barClass}`} style={{ width: passwordStrength.width }} />
              </div>
              <p className={`text-xs font-medium ${passwordStrength.textClass}`}>
                Password strength: {passwordStrength.label}
              </p>
              <ul className="text-[11px] text-slate-400 space-y-0.5 list-disc pl-4">
                <li>At least 8 characters</li>
                <li>Uppercase and lowercase letters</li>
                <li>At least one number</li>
                <li>At least one special character</li>
              </ul>
            </div>
          </div>

          <div>
            <label className="label">Confirm Password</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Updating…' : 'Reset password'}
          </button>
        </form>

        <p className="text-sm text-slate-300">
          Back to <Link to="/login" className="text-violet-300 hover:text-violet-200">Sign In</Link>
        </p>
      </section>
    </main>
  )
}
