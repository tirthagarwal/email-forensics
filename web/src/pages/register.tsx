import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import {
  Shield,
  Building,
  User,
  Mail,
  Lock,
  Phone,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { useRescueAI } from '../lib/store'
import { UserRole } from '../lib/types'

export default function RegisterPage() {
  const router = useRouter()
  const { setCurrentUser } = useRescueAI()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orgName, setOrgName] = useState('')
  const [orgType, setOrgType] = useState<'ngo' | 'veterinary_clinic' | 'municipality' | 'shelter'>('ngo')
  const [role, setRole] = useState<UserRole>('ngo_worker')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!fullName || !email || !password || !orgName) {
      setErrorMsg('Please complete all required fields.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      const newUser = {
        id: `user-${Date.now()}`,
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        organisation_name: orgName.trim(),
        phone: phone.trim() || undefined,
        created_at: new Date().toISOString(),
      }
      setCurrentUser(newUser)
      router.push('/dashboard')
    }, 600)
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>Register Organisation & Staff — RescueAI</title>
      </Head>

      <Navbar />

      <main className="flex-1 py-12 sm:py-20 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-forest-800 text-white flex items-center justify-center mx-auto shadow-soft">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight">
              Create an Organisation Account
            </h1>
            <p className="text-xs text-charcoal-500">
              Join the unified network for stray dog welfare and rabies monitoring.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-6">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Your Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Priya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="priya@cityvetclinic.org"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-charcoal-700">Organisation / Clinic Name *</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Metro Animal Health Foundation"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Organisation Type</label>
                  <select
                    value={orgType}
                    onChange={(e) => setOrgType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    <option value="ngo">Animal Welfare NGO</option>
                    <option value="veterinary_clinic">Veterinary Polyclinic</option>
                    <option value="municipality">Municipal Animal Control</option>
                    <option value="shelter">Rescue Shelter</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Designated Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    <option value="ngo_worker">NGO Field Officer</option>
                    <option value="veterinarian">Veterinarian (DVM)</option>
                    <option value="municipal_officer">Municipal Inspector</option>
                    <option value="admin">Platform Administrator</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Password *</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-charcoal-700">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (800) 555-0199"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="pt-2 text-center text-xs text-charcoal-500">
              Already registered?{' '}
              <Link href="/login" className="text-forest-800 font-bold hover:underline">
                Sign in to your account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
