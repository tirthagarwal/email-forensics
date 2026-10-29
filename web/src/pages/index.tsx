import React from 'react'
import Link from 'next/link'
import Head from 'next/head'
import {
  Shield,
  QrCode,
  Heart,
  Syringe,
  Stethoscope,
  Activity,
  MapPin,
  Sparkles,
  Users,
  CheckCircle2,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  FileText
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { useRescueAI } from '../lib/store'
import { StatusBadge } from '../components/StatusBadge'

export default function LandingPage() {
  const { dogs, isDemoMode, currentUser } = useRescueAI()


  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>RescueAI — Every Stray Dog Deserves a Health Record</title>
      </Head>

      <Navbar />

      <main className="flex-1">
        {/* HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left Copy */}
              <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-100 text-forest-900 border border-forest-200 text-xs font-semibold">
                  <Sparkles className="w-4 h-4 text-forest-700" />
                  <span>AI-Powered Canine Welfare & Rabies Prevention</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-forest-950 tracking-tight leading-[1.1]">
                  Every Stray Dog Deserves a <span className="text-teal-600 underline decoration-teal-300 decoration-wavy">Health Record.</span>
                </h1>

                <p className="text-lg sm:text-xl text-charcoal-600 max-w-2xl font-normal leading-relaxed">
                  RescueAI connects stray dogs with their vaccination records, medical history, and care information through a simple QR-coded collar.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                  <Link
                    href={currentUser ? '/dashboard' : '/login'}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-2xl shadow-soft hover:shadow-soft-lg transition-all"
                  >
                    <span>{currentUser ? 'Go to Dashboard' : 'Login & Get Started'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/scan"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-bold text-forest-950 bg-white hover:bg-forest-50 border border-forest-300 rounded-2xl shadow-2xs transition-all"
                  >
                    <QrCode className="w-5 h-5 text-teal-700" />
                    <span>Scan a Dog's QR</span>
                  </Link>
                </div>


                {/* Key Points */}
                <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-charcoal-600">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Instant Field Identification</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Zero Repeat Vaccinations</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Open Access for Citizens</span>
                  </div>
                </div>
              </div>

              {/* Right Visual Dog Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Outer decorative ring */}
                  <div className="absolute -inset-4 bg-gradient-to-tr from-forest-200 to-teal-100 rounded-3xl transform rotate-2 blur-xs"></div>

                  {/* Main Dog Card Preview */}
                  <div className="relative bg-white rounded-3xl border border-warm-200 p-6 shadow-soft-lg space-y-5">
                    <div className="relative h-64 rounded-2xl overflow-hidden shadow-inner">
                      <img
                        src="https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80"
                        alt="Bruno with RescueAI QR Collar"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <StatusBadge status="Vaccinated" type="vaccination" />
                      </div>
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-xs font-mono font-bold text-charcoal-900 shadow-2xs">
                        RAI-DOG-0001
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 bg-charcoal-950/70 backdrop-blur-xs text-white p-2.5 rounded-xl text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">Bruno</p>
                          <p className="text-[11px] text-warm-200">Indie Mix • Sector 14 Market</p>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center">
                          <QrCode className="w-7 h-7 text-charcoal-950" />
                        </div>
                      </div>
                    </div>

                    {/* Quick Medical Summary Pill */}
                    <div className="bg-warm-50 rounded-2xl p-3.5 border border-warm-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-charcoal-500 font-bold uppercase tracking-wider block">
                          Rabies Immunity Status
                        </span>
                        <span className="font-bold text-emerald-800">
                          Protected through Nov 2026
                        </span>
                      </div>
                      <Link
                        href="/dog/RAI-DOG-0001"
                        className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
                      >
                        <span>View Profile</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    <p className="text-center text-[11px] text-charcoal-400">
                      Physical collar QR opens this verified record instantly on any smartphone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS (4 STEPS) */}
        <section id="how-it-works" className="py-16 sm:py-24 bg-white border-y border-warm-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-700">The 4-Step Lifecycle</span>
              <h2 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
                How RescueAI Works in the Field
              </h2>
              <p className="text-charcoal-600 text-sm sm:text-base leading-relaxed">
                A seamless bridge between field rescue workers, veterinarians, municipal authorities, and community citizens.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Step 1: REGISTER */}
              <div className="bg-warm-50 rounded-3xl p-6 border border-warm-200 flex flex-col justify-between hover:shadow-soft transition-all">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-forest-100 text-forest-800 font-black text-xl flex items-center justify-center border border-forest-200 shadow-2xs">
                    1
                  </div>
                  <h3 className="text-lg font-bold text-forest-950">REGISTER</h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Create a unique digital profile for a stray dog with photo, physical traits, usual territory, and sterilisation status. System assigns an ID like <strong className="font-mono">RAI-DOG-0001</strong>.
                  </p>
                </div>
                <div className="pt-6">
                  <span className="text-[11px] text-teal-700 font-semibold">Zero duplicate entries</span>
                </div>
              </div>

              {/* Step 2: TAG */}
              <div className="bg-warm-50 rounded-3xl p-6 border border-warm-200 flex flex-col justify-between hover:shadow-soft transition-all">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 font-black text-xl flex items-center justify-center border border-teal-200 shadow-2xs">
                    2
                  </div>
                  <h3 className="text-lg font-bold text-forest-950">TAG</h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Generate an instant QR code encoding the dog's permanent public route. Print on a durable anodized aluminum collar medallion and attach to the dog.
                  </p>
                </div>
                <div className="pt-6">
                  <span className="text-[11px] text-teal-700 font-semibold">Durable weatherproof collar</span>
                </div>
              </div>

              {/* Step 3: SCAN */}
              <div className="bg-warm-50 rounded-3xl p-6 border border-warm-200 flex flex-col justify-between hover:shadow-soft transition-all">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-coral-100 text-coral-800 font-black text-xl flex items-center justify-center border border-coral-200 shadow-2xs">
                    3
                  </div>
                  <h3 className="text-lg font-bold text-forest-950">SCAN</h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Veterinarians or concerned citizens scan the QR code using any phone camera. Opens the dog's digital profile instantly without requiring an app install or login.
                  </p>
                </div>
                <div className="pt-6">
                  <span className="text-[11px] text-coral-700 font-semibold">Mobile-first outdoor readability</span>
                </div>
              </div>

              {/* Step 4: CARE */}
              <div className="bg-warm-50 rounded-3xl p-6 border border-warm-200 flex flex-col justify-between hover:shadow-soft transition-all">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center border border-emerald-200 shadow-2xs">
                    4
                  </div>
                  <h3 className="text-lg font-bold text-forest-950">CARE</h3>
                  <p className="text-xs text-charcoal-600 leading-relaxed">
                    Log vaccinations, veterinary examinations, and health observations. Citizens submit sightings or injury reports that alert field rescue teams immediately.
                  </p>
                </div>
                <div className="pt-6">
                  <span className="text-[11px] text-emerald-700 font-semibold">Continuous medical timeline</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID (9 CARDS) */}
        <section id="features" className="py-16 sm:py-24 bg-warm-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Platform Capabilities</span>
              <h2 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
                Designed for Humane Welfare & Public Health
              </h2>
              <p className="text-charcoal-600 text-sm sm:text-base leading-relaxed">
                Everything required by NGOs, veterinary clinics, municipal animal control cells, and community citizens.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {/* Feature 1 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center">
                  <QrCode className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">QR-Based Dog Identification</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Every dog receives a unique, unalterable digital identity. Printable templates support standard round medallions and heavy-duty rectangular collar tags.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <Syringe className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">Vaccination Management</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Track Rabies, DHPP, and Deworming records with dosage, batch numbers, and upcoming booster deadlines. Duplicate prevention prevents repeated unnecessary doses.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">Medical History & Vet Care</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Record full clinical examinations, symptoms, treatments, and recovery progress. Prominent escalation protocols trigger immediately for suspected rabies exposures.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">Health & Activity Observations</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Field workers log manual vital observations (temperature, weight, mobility, appetite) during checkups to monitor trends over time.
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-coral-100 text-coral-800 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">GPS Sightings & Mapping</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Interactive Leaflet map displaying recorded sighting points, designated territories, and vaccination campaign zones across city sectors.
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">AI-Assisted Photo Identification</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Upload a photo of a stray dog to match coat patterns and physical attributes against registered dogs, flagging possible candidate profiles for human verification.
                </p>
              </div>

              {/* Feature 7 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">Smart Alerts & Reminders</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Automated notification engine flags overdue vaccinations, follow-up clinic checkups, damaged collar tags, and unresolved citizen injury reports.
                </p>
              </div>

              {/* Feature 8 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                  <Heart className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">Community Reporting Workflow</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Citizens submit sightings, report injuries, or flag damaged collars with photos and coordinates. Field teams review, assign, and resolve reports.
                </p>
              </div>

              {/* Feature 9 */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs hover:shadow-soft transition-all space-y-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-charcoal-900">NGO & Municipal Coordination</h3>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Shared data plane with role-based security enables veterinary clinics, rescue shelters, and municipal animal control to coordinate seamless rabies prevention.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* IMPACT SECTION */}
        <section className="py-16 sm:py-24 bg-forest-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-teal-300">Public Health & Animal Welfare</span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Measurable Impact for Communities
              </h2>
              <p className="text-forest-200 text-sm sm:text-base leading-relaxed">
                Demonstrating how digital dog identification directly addresses rabies elimination and humane canine management.
              </p>
            </div>

            {/* Impact Metric Cards (Clearly labelled as sample demonstration data) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-5 border border-white/10 text-center">
                <p className="text-3xl sm:text-4xl font-black text-teal-300 mb-1">100%</p>
                <p className="text-xs sm:text-sm font-semibold text-white">Digital Traceability</p>
                <p className="text-[10px] text-forest-300 mt-1">Per-dog vaccination history</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-5 border border-white/10 text-center">
                <p className="text-3xl sm:text-4xl font-black text-teal-300 mb-1">&gt;70%</p>
                <p className="text-xs sm:text-sm font-semibold text-white">Target Herd Immunity</p>
                <p className="text-[10px] text-forest-300 mt-1">WHO Rabies Benchmark</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-5 border border-white/10 text-center">
                <p className="text-3xl sm:text-4xl font-black text-teal-300 mb-1">0</p>
                <p className="text-xs sm:text-sm font-semibold text-white">Duplicate Vaccinations</p>
                <p className="text-[10px] text-forest-300 mt-1">Automated safety checks</p>
              </div>
              <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-5 border border-white/10 text-center">
                <p className="text-3xl sm:text-4xl font-black text-teal-300 mb-1">&lt;30s</p>
                <p className="text-xs sm:text-sm font-semibold text-white">Field Access Time</p>
                <p className="text-[10px] text-forest-300 mt-1">Scan to full health record</p>
              </div>
            </div>

            <p className="text-center text-xs text-forest-300 italic">
              Note: The metrics above represent target operational standards; all platform counts in demo mode are illustrative demonstration records.
            </p>
          </div>
        </section>

        {/* BOTTOM CALL TO ACTION */}
        <section className="py-16 sm:py-20 bg-warm-100 border-t border-warm-200 text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
              Ready to see RescueAI in Action?
            </h2>
            <p className="text-charcoal-600 text-base max-w-xl mx-auto">
              Explore the live demo dashboard, scan a test collar QR tag, or submit a mock community report.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-2xl shadow-soft"
              >
                <span>Launch Dashboard</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
              <Link
                href="/scan"
                className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-bold text-forest-900 bg-white hover:bg-warm-50 border border-warm-300 rounded-2xl shadow-2xs"
              >
                <QrCode className="w-5 h-5 text-teal-700" />
                <span>Test QR Scanner</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
