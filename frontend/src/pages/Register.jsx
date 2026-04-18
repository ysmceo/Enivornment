import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { platformService } from '../services/platformService'
import { authService } from '../services/authService'

export default function Register() {
  const navigate = useNavigate()
  const { register, refreshUser, loading } = useAuth()

  const [states, setStates] = useState([])
  const [idCardTypes, setIdCardTypes] = useState([])
  const fallbackStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
    'Yobe', 'Zamfara',
  ]
  const fallbackIdCardTypes = ['nin', 'bvn', 'passport', 'government_issued_valid_id_card']
  const [idFile, setIdFile] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    state: 'FCT',
    idCardType: 'nin',
    idCardNumber: '',
  })

  const idCardTypeLabels = {
    nin: 'NIN',
    bvn: 'BVN',
    passport: 'Passport',
    government_issued_valid_id_card: 'Government Issued Valid ID Card',
  }

  useEffect(() => {
    const loadStates = async () => {
      try {
        const res = await platformService.getMetadata()
        setStates(res.data.metadata?.states || fallbackStates)
        setIdCardTypes(res.data.metadata?.idCardTypes || fallbackIdCardTypes)
      } catch {
        setStates(fallbackStates)
        setIdCardTypes(fallbackIdCardTypes)
      }
    }

    loadStates()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!form.idCardNumber.trim()) {
      toast.error('Please enter your ID card number')
      return
    }

    if (!idFile) {
      toast.error('Please upload a valid government ID file (JPG, PNG, WEBP, or PDF)')
      return
    }

    const result = await register(form)
    if (!result.success) {
      toast.error(result.message)
      return
    }

    try {
      await authService.uploadGovernmentId(idFile, form.idCardNumber)
      await refreshUser()
      toast.success('Account created and ID uploaded for verification')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Account created, but ID upload failed')
      return
    }

    navigate('/dashboard')
  }

  return (
    <main className="min-h-screen grid place-items-center p-4">
      <section className="card p-6 w-full max-w-lg">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-sm text-slate-500 mt-1">Register across all 36 states + FCT for secure civic reporting.</p>

        <form onSubmit={onSubmit} className="space-y-4 mt-5">
          <div>
            <label className="label">Full Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className="label">State</label>
              <select className="select" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">ID Card Type</label>
            <select
              className="select"
              value={form.idCardType}
              onChange={(e) => setForm((p) => ({ ...p, idCardType: e.target.value }))}
              required
            >
              {idCardTypes.map((type) => (
                <option key={type} value={type}>
                  {idCardTypeLabels[type] || type.replaceAll('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">Choose one: NIN, BVN, Passport, or Government Issued Valid ID Card.</p>
          </div>

          <div>
            <label className="label">ID Card Number</label>
            <input
              className="input"
              value={form.idCardNumber}
              onChange={(e) => setForm((p) => ({ ...p, idCardNumber: e.target.value }))}
              required
              placeholder="Enter your selected ID number"
            />
          </div>

          <div>
            <label className="label">Government ID Upload (required)</label>
            <input className="input" type="file" accept="image/*,.pdf" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-slate-500 mt-1">Allowed formats: JPG, PNG, WEBP, PDF. Max size: 5MB.</p>
          </div>

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-slate-500 mt-4">
          Already registered? <Link to="/login" className="text-indigo-600">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
