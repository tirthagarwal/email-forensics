import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import {
  Shield,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Heart,
  Phone,
  QrCode,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Users,
  Building,
  Stethoscope
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { useRescueAI } from '../lib/store'
import { UserRole } from '../lib/types'
import { SEED_USERS } from '../lib/seedData'

export default function LoginPage() {
  const router = useRouter()
  const { loginAsRole, setCurrentUser } = useRescueAI()

  // Tab: 'citizen' (default) vs 'staff'
  const [activeTab, setActiveTab] = useState<'citizen' | 'staff'>('citizen')

  // Citizen Login Form State
  const [citizenPhone, setCitizenPhone] = useState('')
  const [citizenName, setCitizenName] = useState('')
  const [citizenArea, setCitizenArea] = useState('')
  const [isRegisteringCitizen, setIsRegisteringCitizen] = useState(false)
  const [citizenSuccessMsg, setCitizenSuccessMsg] = useState('')

  // Staff Login Form State
  const [staffEmail, setStaffEmail] = useState('')
  const [staffPassword, setStaffPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Handle Citizen Login / Registration
  const handleCitizenSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    setTimeout(() => {
      setLoading(false)
      const fullName = citizenName.trim() || 'Community Citizen'
      const phone = citizenPhone.trim() || '+1 (800) 555-0122'

      setCurrentUser({
        id: `citizen-${Date.now()}`,
        email: phone.includes('@') ? phone : `${phone.replace(/\D/g, '') || 'citizen'}@community.rescueai.org`,
        full_name: fullName,
        role: 'citizen',
        phone: phone,
        organisation_name: citizenArea ? `${citizenArea} Community Watch` : 'Community Animal Guardian',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        created_at: new Date().toISOString(),
      })

      router.push('/dashboard')
    }, 400)
  }

  // Handle 1-Click Role Login
  const handleOneClickRole = (role: UserRole) => {
    loginAsRole(role)
    router.push('/dashboard')
  }

  // Handle Staff Email/Password Login
  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    const found = SEED_USERS.find((u) => u.email.toLowerCase() === staffEmail.toLowerCase().trim())

    setTimeout(() => {
      setLoading(false)
      if (found) {
        setCurrentUser(found)
        router.push('/dashboard')
      } else if (staffEmail && staffPassword) {
        setCurrentUser({
          id: `custom-staff-${Date.now()}`,
          email: staffEmail,
          full_name: staffEmail.split('@')[0],
          role: 'ngo_worker',
          organisation_name: 'Animal Welfare Partner',
          created_at: new Date().toISOString(),
        })
        router.push('/dashboard')
      } else {
        setErrorMsg('Please enter both your work email and password.')
      }
    }, 500)
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>Citizen & Staff Login — RescueAI Stray Dog Platform</title>
        <meta
          name="description"
          content="Sign in as a citizen or authorized staff to scan stray dog QR collars, view vaccination records, and report rescues."
        />
      </Head>

      <Navbar />

      <main className="flex-1 py-10 sm:py-16 flex items-center justify-center px-4 sm:px-6">
        <div className="max-w-xl w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-forest-800 text-white flex items-center justify-center mx-auto shadow-soft">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight">
              Sign In to RescueAI
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-600 max-w-md mx-auto">
              First, log in as a citizen or welfare worker to scan QR collar tags, check dog rabies records, and coordinate rescues.
            </p>
          </div>

          {/* Tab Selector: Citizen (Default) vs Staff */}
          <div className="bg-white p-1.5 rounded-2xl border border-warm-200 shadow-2xs grid grid-cols-2 gap-1.5 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('citizen')
                setErrorMsg('')
              }}
              className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'citizen'
                  ? 'bg-forest-800 text-white shadow-soft'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-100'
              }`}
            >
              <Heart className="w-4 h-4 text-rose-400" />
              <span>1. Citizen / Community Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('staff')
                setErrorMsg('')
              }}
              className={`py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                activeTab === 'staff'
                  ? 'bg-forest-800 text-white shadow-soft'
                  : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-100'
              }`}
            >
              <Building className="w-4 h-4 text-teal-300" />
              <span>2. Staff & Official Portal</span>
            </button>
          </div>

          {/* TAB 1: CITIZEN LOGIN (FIRST CITIZENS HAVE TO LOGIN) */}
          {activeTab === 'citizen' && (
            <div className="space-y-4">
              {/* Instant 1-Click Citizen Pass Box */}
              <div className="bg-gradient-to-br from-forest-900 to-teal-900 text-white rounded-3xl p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-300" />
                    <span>Quick Citizen Access (1-Click)</span>
                  </span>
                  <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                    Recommended for First Time
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Alex Rivera (Community Volunteer)</h3>
                  <p className="text-xs text-warm-200 leading-relaxed">
                    Instantly sign in as a verified citizen to test scanning dog collar QR codes, logging neighborhood dog sightings, and reporting injured strays.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOneClickRole('citizen')}
                  className="w-full py-3 px-4 rounded-xl bg-white hover:bg-warm-100 text-forest-950 font-bold text-sm shadow-md flex items-center justify-center gap-2 group transition-all"
                >
                  <UserCheck className="w-4 h-4 text-forest-800" />
                  <span>Enter as Citizen Alex Rivera</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Citizen Custom Sign In Form */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-warm-200 shadow-soft space-y-5">
                <div className="flex items-center justify-between border-b border-warm-100 pb-3">
                  <div>
                    <h2 className="text-sm font-bold text-charcoal-900">
                      {isRegisteringCitizen ? 'Register as New Citizen Rescuer' : 'Sign In with Mobile Phone or Email'}
                    </h2>
                    <p className="text-xs text-charcoal-500">
                      {isRegisteringCitizen
                        ? 'Join your community stray dog welfare network in 30 seconds.'
                        : 'Enter your phone number or email to access your citizen dashboard.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRegisteringCitizen(!isRegisteringCitizen)}
                    className="text-xs font-bold text-teal-700 hover:underline"
                  >
                    {isRegisteringCitizen ? 'Already Registered? Sign In' : 'New Citizen? Sign Up'}
                  </button>
                </div>

                <form onSubmit={handleCitizenSubmit} className="space-y-4 text-xs">
                  {isRegisteringCitizen && (
                    <div className="space-y-1">
                      <label className="font-semibold text-charcoal-700">Your Full Name</label>
                      <input
                        type="text"
                        required
                        value={citizenName}
                        onChange={(e) => setCitizenName(e.target.value)}
                        placeholder="e.g. Priya Sharma or Rahul Roy"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 bg-warm-50/50"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-semibold text-charcoal-700">Mobile Phone Number or Email</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={citizenPhone}
                        onChange={(e) => setCitizenPhone(e.target.value)}
                        placeholder="e.g. +91 98200 12345 or citizen@example.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 bg-warm-50/50"
                      />
                    </div>
                    <p className="text-[10px] text-charcoal-400">Used for citizen rescue ticket updates and emergency notifications.</p>
                  </div>

                  {isRegisteringCitizen && (
                    <div className="space-y-1">
                      <label className="font-semibold text-charcoal-700">Your Neighborhood / Colony / Sector</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={citizenArea}
                          onChange={(e) => setCitizenArea(e.target.value)}
                          placeholder="e.g. Sector 14 Market or Riverside Colony"
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 bg-warm-50/50"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                    <span>{loading ? 'Signing in...' : isRegisteringCitizen ? 'Create Citizen Account & Sign In' : 'Continue to Citizen Dashboard'}</span>
                  </button>
                </form>

                {/* Citizen Benefits Checklist */}
                <div className="bg-warm-50 rounded-2xl p-4 border border-warm-200 space-y-2 text-xs text-charcoal-600">
                  <p className="font-bold text-charcoal-900 text-[11px] uppercase tracking-wider">
                    As a Citizen Member, you can:
                  </p>
                  <ul className="space-y-1.5 text-[11px]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Scan any dog's collar QR tag to view verified rabies vaccination records</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Report injured, sick, or missing dogs with 1-click GPS location & photo</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Track field worker dispatch and veterinary care status for reported strays</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STAFF & OFFICIAL PORTAL */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              {/* Demonstration Role Fast-Login Box */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>1-Click Authorized Staff Testing</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Ready to Test
                  </span>
                </div>

                <p className="text-xs text-charcoal-500 leading-relaxed">
                  Select a clinical or administrative persona to experience RescueAI with full staff permissions:
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleOneClickRole('admin')}
                    className="w-full p-3 rounded-2xl border border-warm-200 hover:border-forest-600 bg-warm-50/50 hover:bg-forest-50/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div>
                      <p className="text-xs font-bold text-charcoal-900 group-hover:text-forest-900">
                        Dr. Sarah Jenkins (Platform Administrator)
                      </p>
                      <p className="text-[10px] text-charcoal-500">
                        Full platform control, user permissions, duplicate immunization resolver
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-forest-800 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOneClickRole('ngo_worker')}
                    className="w-full p-3 rounded-2xl border border-warm-200 hover:border-forest-600 bg-warm-50/50 hover:bg-forest-50/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div>
                      <p className="text-xs font-bold text-charcoal-900 group-hover:text-forest-900">
                        David Martinez (NGO Field Officer — Paws & Hope)
                      </p>
                      <p className="text-[10px] text-charcoal-500">
                        Intake new dogs, generate collar tags, log sightings & vitals
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-forest-800 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOneClickRole('veterinarian')}
                    className="w-full p-3 rounded-2xl border border-warm-200 hover:border-forest-600 bg-warm-50/50 hover:bg-forest-50/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div>
                      <p className="text-xs font-bold text-charcoal-900 group-hover:text-forest-900">
                        Dr. Arun Patel, DVM (Veterinarian — Metro Clinic)
                      </p>
                      <p className="text-[10px] text-charcoal-500">
                        Medical examinations, rabies vaccines, quarantine management
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-forest-800 group-hover:translate-x-0.5 transition-all" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOneClickRole('municipal_officer')}
                    className="w-full p-3 rounded-2xl border border-warm-200 hover:border-forest-600 bg-warm-50/50 hover:bg-forest-50/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div>
                      <p className="text-xs font-bold text-charcoal-900 group-hover:text-forest-900">
                        Officer Clara Vance (Municipal Authority)
                      </p>
                      <p className="text-[10px] text-charcoal-500">
                        Ward vaccination coverage, rabies risk hotspots & compliance audit
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-charcoal-400 group-hover:text-forest-800 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </div>
              </div>

              {/* Custom Credentials Form for Staff */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-soft space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                  Staff Email & Password Authentication
                </h2>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleStaffLogin} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-charcoal-700">Official Work Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="e.g. admin@rescueai.org or dr.arun@metroclinic.gov"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 bg-warm-50/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-charcoal-700">Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 bg-warm-50/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-soft transition-all"
                  >
                    {loading ? 'Authenticating Staff...' : 'Sign In to Staff Console'}
                  </button>
                </form>

                <div className="pt-2 text-center text-xs text-charcoal-500">
                  Register a new organization?{' '}
                  <Link href="/register" className="text-forest-800 font-bold hover:underline">
                    Register NGO / Clinic
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
