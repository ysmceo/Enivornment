import { useEffect, useMemo, useState } from 'react'
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
  const [premiumReceiptFile, setPremiumReceiptFile] = useState(null)
  const [cloudinaryConfigured, setCloudinaryConfigured] = useState(true)
  const [premiumConfig, setPremiumConfig] = useState(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    dateOfBirth: '',
    adultConsentAccepted: false,
    minorConsentAccepted: false,
    state: 'FCT',
    idCardType: 'nin',
    idCardNumber: '',
    selectedPlan: 'free',
    premiumTransferReference: '',
    premiumTransferAmount: '',
    premiumTransferDate: '',
    premiumTransferSenderName: '',
    premiumTransferNote: '',
  })

  const age = useMemo(() => {
    if (!form.dateOfBirth) return null
    const dob = new Date(form.dateOfBirth)
    if (Number.isNaN(dob.getTime())) return null

    const today = new Date()
    let years = today.getFullYear() - dob.getFullYear()
    const monthDiff = today.getMonth() - dob.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      years -= 1
    }
    return years
  }, [form.dateOfBirth])

  const isAdult = age !== null && age >= 18

  const idCardTypeLabels = {
    nin: 'NIN',
    bvn: 'BVN',
    passport: 'Passport',
    government_issued_valid_id_card: 'Government Issued Valid ID Card',
  }

  useEffect(() => {
    const loadStates = async () => {
      try {
        const [metaRes, healthRes, premiumRes] = await Promise.all([
          platformService.getMetadata(),
          platformService.getConfigHealth(),
          authService.getPremiumConfig(),
        ])

        setStates(metaRes.data.metadata?.states || fallbackStates)
        setIdCardTypes(metaRes.data.metadata?.idCardTypes || fallbackIdCardTypes)
        setCloudinaryConfigured(Boolean(healthRes.data?.configHealth?.cloudinary?.configured))
        setPremiumConfig(premiumRes?.data?.config || null)
      } catch {
        setStates(fallbackStates)
        setIdCardTypes(fallbackIdCardTypes)
        setCloudinaryConfigured(false)
        setPremiumConfig(null)
      }
    }

    loadStates()
  }, [])

  const onSubmit = async (e) => {
    e.preventDefault()

    if (!form.dateOfBirth) {
      toast.error('Please select your date of birth')
      return
    }

    if (isAdult && !form.adultConsentAccepted) {
      toast.error('Users aged 18 and above must accept consent before registration')
      return
    }

    if (age !== null && !isAdult && !form.minorConsentAccepted) {
      toast.error('Users below 18 must accept the minor consent before registration')
      return
    }

    if (isAdult && cloudinaryConfigured) {
      if (!form.idCardNumber.trim()) {
        toast.error('Please enter your ID card number')
        return
      }

      if (!idFile) {
        toast.error('Please upload a valid government ID file (JPG, PNG, WEBP, or PDF)')
        return
      }
    }

    if (form.selectedPlan === 'premium' && !String(form.premiumTransferReference || '').trim()) {
      toast.error('Premium registration requires a transfer reference after bank transfer')
      return
    }

    if (form.selectedPlan === 'premium' && !premiumReceiptFile) {
      toast.error('Please upload your premium payment receipt before registration')
      return
    }

    const registerPayload = {
      name: form.name,
      email: form.email,
      password: form.password,
      phone: form.phone,
      state: form.state,
      dateOfBirth: form.dateOfBirth,
      adultConsentAccepted: isAdult ? form.adultConsentAccepted : false,
      minorConsentAccepted: !isAdult ? form.minorConsentAccepted : false,
      idCardType: isAdult ? form.idCardType : undefined,
      selectedPlan: form.selectedPlan,
      premiumTransferReference: form.selectedPlan === 'premium' ? form.premiumTransferReference : undefined,
      premiumTransferAmount: form.selectedPlan === 'premium' && form.premiumTransferAmount
        ? Number(form.premiumTransferAmount)
        : undefined,
      premiumTransferDate: form.selectedPlan === 'premium' ? form.premiumTransferDate : undefined,
      premiumTransferSenderName: form.selectedPlan === 'premium' ? form.premiumTransferSenderName : undefined,
      premiumTransferNote: form.selectedPlan === 'premium' ? form.premiumTransferNote : undefined,
    }

    const result = await register(registerPayload)
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

    if (isAdult && cloudinaryConfigured) {
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
      toast('Government ID upload is temporarily unavailable. Account creation can still continue.', { icon: 'ℹ️' })
    }

    if (form.selectedPlan === 'premium') {
      try {
        await authService.requestPremiumUpgrade({
          transferReference: form.premiumTransferReference,
          transferAmount: form.premiumTransferAmount ? Number(form.premiumTransferAmount) : undefined,
          transferDate: form.premiumTransferDate || undefined,
          senderName: form.premiumTransferSenderName || undefined,
          note: form.premiumTransferNote || undefined,
          paymentReceipt: premiumReceiptFile,
        })
        toast.success('Premium request submitted with receipt. Admin will verify and activate your premium access.')
      } catch (err) {
        const message = err.response?.data?.message || 'Account created, but premium request submission failed'
        toast.error(message)
        toast('Open your dashboard subscription section to re-submit premium payment details and receipt.', { icon: 'ℹ️' })
      }
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
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-sm text-slate-300 mt-1">Register across Nigeria’s 36 states and the FCT for secure civic reporting.</p>

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

          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 space-y-2">
            <p className="text-sm font-semibold text-slate-100">Select Plan</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <label className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${form.selectedPlan === 'free' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 text-slate-300'}`}>
                <input
                  type="radio"
                  name="selectedPlan"
                  className="mr-2"
                  checked={form.selectedPlan === 'free'}
                  onChange={() => setForm((p) => ({ ...p, selectedPlan: 'free' }))}
                />
                Free Plan (instant access)
              </label>
              <label className={`rounded-lg border px-3 py-2 text-sm cursor-pointer ${form.selectedPlan === 'premium' ? 'border-amber-500 bg-amber-500/10 text-amber-300' : 'border-slate-700 text-slate-300'}`}>
                <input
                  type="radio"
                  name="selectedPlan"
                  className="mr-2"
                  checked={form.selectedPlan === 'premium'}
                  onChange={() => setForm((p) => ({ ...p, selectedPlan: 'premium' }))}
                />
                Premium Plan (manual transfer + admin approval)
              </label>
            </div>

            {form.selectedPlan === 'premium' && (
              <div className="rounded-lg border border-amber-600/60 bg-amber-500/10 p-3 space-y-2">
                <p className="text-xs text-amber-200 font-semibold">Transfer premium fee to this bank account:</p>
                <p className="text-xs text-amber-100">
                  Account Name: <span className="font-semibold">{premiumConfig?.bankAccount?.accountName || 'VOV Crime Premium'}</span><br />
                  Account Number: <span className="font-semibold">{premiumConfig?.bankAccount?.accountNumber || '0000000000'}</span><br />
                  Bank: <span className="font-semibold">{premiumConfig?.bankAccount?.bankName || 'Your Bank Name'}</span><br />
                  Amount: <span className="font-semibold">₦{Number(premiumConfig?.amount || 5000).toLocaleString()}</span>
                </p>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Transfer Reference *</label>
                    <input
                      className="input"
                      value={form.premiumTransferReference}
                      onChange={(e) => setForm((p) => ({ ...p, premiumTransferReference: e.target.value }))}
                      placeholder="e.g. TRF-239482"
                      required={form.selectedPlan === 'premium'}
                    />
                  </div>
                  <div>
                    <label className="label">Amount Transferred (NGN)</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      value={form.premiumTransferAmount}
                      onChange={(e) => setForm((p) => ({ ...p, premiumTransferAmount: e.target.value }))}
                      placeholder="5000"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Transfer Date</label>
                    <input
                      className="input"
                      type="date"
                      value={form.premiumTransferDate}
                      onChange={(e) => setForm((p) => ({ ...p, premiumTransferDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label">Sender Name</label>
                    <input
                      className="input"
                      value={form.premiumTransferSenderName}
                      onChange={(e) => setForm((p) => ({ ...p, premiumTransferSenderName: e.target.value }))}
                      placeholder="Bank account sender"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Note (optional)</label>
                  <textarea
                    className="textarea"
                    rows={2}
                    value={form.premiumTransferNote}
                    onChange={(e) => setForm((p) => ({ ...p, premiumTransferNote: e.target.value }))}
                    placeholder="Any extra payment detail for admin verification"
                  />
                </div>

                <div>
                  <label className="label">Payment Receipt Upload *</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setPremiumReceiptFile(e.target.files?.[0] || null)}
                    required={form.selectedPlan === 'premium'}
                  />
                  <p className="text-xs text-slate-400 mt-1">Upload transfer receipt (JPG, PNG, WEBP, or PDF). Max size: 5MB.</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input
                className="input"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">State</label>
              <select className="select" value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300">
              <p className="font-semibold text-slate-100">Age status</p>
              <p className="mt-1">
                {age === null
                  ? 'Select your date of birth to continue.'
                  : isAdult
                    ? `You are ${age}. Adult registration requires consent and identity details.`
                    : `You are ${age}. Identity upload is not required for users below 18.`}
              </p>
            </div>
          </div>

          {isAdult && (
            <>
              <label className="flex items-start gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={form.adultConsentAccepted}
                  onChange={(e) => setForm((p) => ({ ...p, adultConsentAccepted: e.target.checked }))}
                  className="mt-1"
                  required
                />
                <span>
                  I confirm I am 18 years or older and I consent to identity verification for platform safety.
                </span>
              </label>

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
            </>
          )}

          {age !== null && !isAdult && (
            <label className="flex items-start gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={form.minorConsentAccepted}
                onChange={(e) => setForm((p) => ({ ...p, minorConsentAccepted: e.target.checked }))}
                className="mt-1"
                required
              />
              <span>
                I confirm I am below 18 years old and I (with guardian awareness where required) consent to minor account registration and platform safety checks.
              </span>
            </label>
          )}

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

          {isAdult && (
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
                <p className="text-xs text-amber-300 mt-1">Government ID upload is temporarily unavailable. Account creation can still continue.</p>
              )}
            </div>
          )}

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
