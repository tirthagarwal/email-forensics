import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import {
  Heart,
  AlertTriangle,
  MapPin,
  Camera,
  CheckCircle,
  Shield,
  ArrowRight,
  Info,
  Phone,
  Crosshair
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { useRescueAI } from '../lib/store'
import { ReportType } from '../lib/types'

export default function PublicReportPage() {
  const router = useRouter()
  const { type, dogId } = router.query
  const { submitCommunityReport, dogs } = useRescueAI()

  const [reportType, setReportType] = useState<ReportType>('Injured Dog')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | undefined>(undefined)
  const [longitude, setLongitude] = useState<number | undefined>(undefined)
  const [dogIdentifier, setDogIdentifier] = useState('')
  const [reporterName, setReporterName] = useState('')
  const [reporterPhone, setReporterPhone] = useState('')
  const [reporterEmail, setReporterEmail] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [locating, setLocating] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (type && typeof type === 'string') {
      const validTypes: ReportType[] = [
        'Injured Dog',
        'Sick Dog',
        'Suspected Rabies Concern',
        'Dog Sighting',
        'Damaged / Missing Collar',
      ]
      if (validTypes.includes(type as ReportType)) {
        setReportType(type as ReportType)
      }
    }
    if (dogId && typeof dogId === 'string') {
      setDogIdentifier(dogId)
    }
  }, [type, dogId])

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please enter the address or landmark manually.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setAddress(`Near Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`)
        setLocating(false)
      },
      (err) => {
        setLocating(false)
        alert('Could not retrieve current location. Please enter your location or nearest landmark manually.')
      },
      { timeout: 10000 }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!description.trim()) {
      setErrorMsg('Please provide a brief description of the dog or incident.')
      return
    }
    if (!address.trim()) {
      setErrorMsg('Please specify the location or nearest landmark.')
      return
    }

    const refNumber = submitCommunityReport({
      report_type: reportType,
      description: description.trim(),
      location: {
        lat: latitude || 28.5355,
        lng: longitude || 77.3910,
        address: address.trim(),
      },
      photo_url: photoUrl || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80',
      dog_id: dogIdentifier.trim() || undefined,
      reporter_name: reporterName.trim() || 'Anonymous Citizen',
      reporter_phone: reporterPhone.trim() || undefined,
      reporter_email: reporterEmail.trim() || undefined,
    })

    setSubmittedRef(refNumber)
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>Report Stray Dog or Concern — RescueAI</title>
        <meta
          name="description"
          content="Report an injured, sick, or sighted stray dog. Community submissions are routed immediately to local NGO rescue teams and veterinarians."
        />
      </Head>

      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          {submittedRef ? (
            /* SUBMISSION CONFIRMATION */
            <div className="bg-white rounded-3xl border border-warm-200 p-8 shadow-soft text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                <CheckCircle className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-forest-950">
                  Report Received. Thank You!
                </h1>
                <p className="text-xs text-charcoal-500">
                  Your report has been logged and assigned to local animal welfare field teams.
                </p>
              </div>

              {/* Reference Badge */}
              <div className="p-4 bg-warm-50 border border-warm-200 rounded-2xl max-w-sm mx-auto">
                <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">
                  Report Tracking Reference Number
                </span>
                <span className="font-mono text-xl font-black text-forest-900 tracking-wider">
                  {submittedRef}
                </span>
              </div>

              <p className="text-xs text-charcoal-600 max-w-md mx-auto leading-relaxed">
                If the dog requires urgent emergency medical treatment, our NGO dispatch team coordinates with the nearest veterinary polyclinic.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/"
                  className="px-6 py-3 bg-forest-800 text-white rounded-xl text-sm font-semibold hover:bg-forest-900 shadow-soft"
                >
                  Return to Home
                </Link>
                <Link
                  href="/scan"
                  className="px-6 py-3 bg-white border border-warm-300 text-charcoal-800 rounded-xl text-sm font-semibold hover:bg-warm-100"
                >
                  Scan Another Collar
                </Link>
              </div>
            </div>
          ) : (
            /* REPORT FORM */
            <div className="bg-white rounded-3xl border border-warm-200 p-6 sm:p-10 shadow-soft space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-coral-100 text-coral-900 border border-coral-200 text-xs font-semibold mb-3">
                  <Heart className="w-3.5 h-3.5 text-coral-700" />
                  <span>Citizen Action Hotline</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-forest-950 tracking-tight">
                  Report an Injured, Sick, or Sighted Dog
                </h1>
                <p className="text-xs text-charcoal-600 mt-1 leading-relaxed">
                  Submissions are reviewed in real-time by municipal cells and partner animal welfare NGOs.
                </p>
              </div>

              {/* Urgent Rabies Callout */}
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Suspected Rabies or Bite Incident?</strong> For immediate containment, call the Municipal Rabies Control Squad directly at <strong>+1 (800) 555-PAWS</strong> in addition to submitting this form.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Report Type */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-charcoal-800 uppercase tracking-wide">
                    Report Type *
                  </label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-charcoal-900 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-forest-600 font-medium"
                  >
                    <option value="Injured Dog">Injured Dog (Limping, wound, accident)</option>
                    <option value="Sick Dog">Sick Dog (Skin condition, lethargic, vomiting)</option>
                    <option value="Suspected Rabies Concern">Suspected Rabies Concern (Aggression, foaming)</option>
                    <option value="Dog Sighting">Routine Dog Sighting (Update territory location)</option>
                    <option value="Damaged / Missing Collar">Damaged / Missing QR Collar</option>
                  </select>
                </div>

                {/* 2. Dog ID (if known) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-charcoal-800 uppercase tracking-wide">
                    Dog ID or Tag ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={dogIdentifier}
                    onChange={(e) => setDogIdentifier(e.target.value)}
                    placeholder="e.g. RAI-DOG-0001 or TAG-RAI-0001 (leave blank if unknown)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-charcoal-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                  <p className="text-[11px] text-charcoal-400">
                    If the dog has a visible collar, enter the ID engraved below the QR code.
                  </p>
                </div>

                {/* 3. Location */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-charcoal-800 uppercase tracking-wide">
                      Location / Landmark *
                    </label>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{locating ? 'Detecting GPS...' : 'Use My GPS Location'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Metro Station Gate 2, beside fruit stall, Sector 14"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-charcoal-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>

                {/* 4. Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-charcoal-800 uppercase tracking-wide">
                    Observations & Description *
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the dog's appearance (color, size, markings) and observed injuries or condition..."
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-charcoal-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>

                {/* 5. Optional Photograph */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-charcoal-800 uppercase tracking-wide">
                    Photo URL or Preset (Optional)
                  </label>
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or paste image link"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-charcoal-900 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                  <div className="flex gap-2 pt-1 text-[11px] text-charcoal-500">
                    <span>Quick Sample Photos:</span>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80')}
                      className="underline text-teal-700 font-medium"
                    >
                      Brown Indie
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoUrl('https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&auto=format&fit=crop&q=80')}
                      className="underline text-teal-700 font-medium"
                    >
                      Limping Terrier
                    </button>
                  </div>
                </div>

                {/* 6. Reporter Info */}
                <div className="pt-4 border-t border-warm-200 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-forest-700" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-800">
                      Reporter Information (Optional & Protected)
                    </h2>
                  </div>
                  <p className="text-[11px] text-charcoal-500">
                    Your contact info is never shown publicly. It is only accessible to the assigned NGO field responder if follow-up location directions are needed.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Your Name"
                      className="px-3.5 py-2 rounded-xl border border-warm-300 text-charcoal-900 text-sm"
                    />
                    <input
                      type="tel"
                      value={reporterPhone}
                      onChange={(e) => setReporterPhone(e.target.value)}
                      placeholder="Phone Number for Field Dispatch"
                      className="px-3.5 py-2 rounded-xl border border-warm-300 text-charcoal-900 text-sm"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-soft hover:shadow-soft-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Heart className="w-4 h-4 fill-white" />
                    <span>Submit Community Report</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
