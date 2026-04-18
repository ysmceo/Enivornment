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
  const [profilePhotoFile, setProfilePhotoFile] = useState(null)
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(true)
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
        const [metaRes, healthRes] = await Promise.all([
          platformService.getMetadata(),
          platformService.getConfigHealth(),
        ])

        setStates(metaRes.data.metadata?.states || fallbackStates)
        setIdCardTypes(metaRes.data.metadata?.idCardTypes || fallbackIdCardTypes)
        setCloudinaryConfigured(Boolean(healthRes.data?.configHealth?.cloudinary?.configured))
      } catch {
        setStates(fallbackStates)
        setIdCardTypes(fallbackIdCardTypes)
        setCloudinaryConfigured(false)
      }
    }

    loadStates()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()

    if (cloudinaryConfigured) {
      if (!form.idCardNumber.trim()) {
        toast.error('Please enter your ID card number')
        return
      }

      if (!idFile) {
        toast.error('Please upload a valid government ID file (JPG, PNG, WEBP, or PDF)')
        return
      }
    }

    const result = await register(form)
    if (!result.success) {
      toast.error(result.message)
      return
    }

    if (profilePhotoFile) {
      try {
        await authService.uploadProfilePhoto(profilePhotoFile)
        await refreshUser()
        toast.success('Profile picture uploaded successfully')
      } catch (err) {
        const message = err.response?.data?.message || 'Account created, but profile picture upload failed'
        toast.error(message)
        toast('You can continue and upload a profile picture later.', { icon: 'ℹ️' })
      }
    }

    if (cloudinaryConfigured) {
      try {
        await authService.uploadGovernmentId(idFile, form.idCardNumber)
        await refreshUser()
        toast.success('Account created and ID uploaded for verification')
      } catch (err) {
        const message = err.response?.data?.message || 'Account created, but ID upload failed'
        toast.error(message)
        toast('You can still continue and sign in. Upload can be retried later.', { icon: 'ℹ️' })
      }
    } else {
      toast('Government ID upload is not configured yet (Cloudinary keys are placeholders). Account creation can still continue.', { icon: 'ℹ️' })
    }

    navigate('/dashboard')
  }

  return (
    <main className="min-h-screen grid place-items-center p-4 relative overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -right-10 w-80 h-80 bg-emerald-500/20 blur-3xl rounded-full" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/20 blur-3xl rounded-full" />
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-amber-500/10 blur-3xl rounded-full" />
      </div>

      <section className="card p-6 w-full max-w-lg relative border border-emerald-500/30 bg-gradient-to-br from-slate-900/95 to-slate-800/90 shadow-2xl shadow-emerald-900/25">
        <h1 className="text-2xl font-bold text-white">Create account</h1>
        <p className="text-sm text-slate-300 mt-1">Register across all 36 states + FCT for secure civic reporting.</p>

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
            <p className="text-xs text-slate-400 mt-1">Choose one: NIN, BVN, Passport, or Government Issued Valid ID Card.</p>
          </div>

          <div>
            <label className="label">ID Card Number</label>
            <input
              className="input"
              value={form.idCardNumber}
              onChange={(e) => setForm((p) => ({ ...p, idCardNumber: e.target.value }))}
              required={cloudinaryConfigured}
              placeholder="Enter your selected ID number"
            />
          </div>

          <div>
            <label className="label">Profile Picture (optional)</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-slate-400 mt-1">Allowed formats: JPG, PNG, WEBP, GIF. Max size: 10MB.</p>
          </div>

          <div>
            <label className="label">Government ID Upload ({cloudinaryConfigured ? 'required' : 'optional'})</label>
            <input
              className="input"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setIdFile(e.target.files?.[0] || null)}
              disabled={!cloudinaryConfigured}
            />
            <p className="text-xs text-slate-400 mt-1">Allowed formats: JPG, PNG, WEBP, PDF. Max size: 5MB.</p>
            {!cloudinaryConfigured && (
              <p className="text-xs text-amber-300 mt-1">Government ID upload is not configured yet (Cloudinary keys are placeholders). Account creation can still continue.</p>
            )}
          </div>

          <button className="btn-primary w-full" disabled={loading} type="submit">
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-sm text-slate-300 mt-4">
          Already registered? <Link to="/login" className="text-emerald-300 hover:text-emerald-200">Sign in</Link>
        </p>
      </section>
    </main>
  )
}
