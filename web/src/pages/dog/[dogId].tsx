import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { GetStaticPaths, GetStaticProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { SEED_DOGS } from '../../lib/seedData'
import {
  Shield,
  QrCode,
  Heart,
  AlertTriangle,
  Calendar,
  Syringe,
  MapPin,
  Phone,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  Info,
  Clock,
  Stethoscope,
  Dog as DogIcon,
  ExternalLink,
  AlertCircle,
  ArrowRight,
  LogIn
} from 'lucide-react'
import { useRescueAI } from '../../lib/store'
import { StatusBadge } from '../../components/StatusBadge'
import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'

export default function PublicDogProfile() {
  const router = useRouter()
  const { dogId } = router.query
  const { dogs, vaccinations, medicalRecords, sightings, currentUser } = useRescueAI()
  const [showReportSent, setShowReportSent] = useState(false)

  const dog = dogs.find(
    (d) =>
      d.dog_id.toLowerCase() === String(dogId).toLowerCase() ||
      d.id === String(dogId) ||
      d.qr_tag_id.toLowerCase() === String(dogId).toLowerCase()
  )

  const dogVaccinations = vaccinations.filter((v) => v.dog_id === dog?.dog_id)
  const recentMedical = medicalRecords.filter((m) => m.dog_id === dog?.dog_id)
  const dogSightings = sightings.filter((s) => s.dog_id === dog?.dog_id)
  const lastRabiesVac = dogVaccinations.find(
    (v) => v.disease_targeted.toLowerCase().includes('rabies') || v.vaccine_name.toLowerCase().includes('rabies')
  )
  const isUrgent = dog?.health_status === 'Critical' || dog?.health_status === 'Quarantined'
  const isQuarantined = dog?.health_status === 'Quarantined'

  // Loading state before router ready
  if (!router.isReady) {
    return (
      <div className="min-h-screen bg-warm-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-forest-800 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-charcoal-500 font-medium">Loading Dog Health Record...</p>
        </div>
      </div>
    )
  }

  // Dog not found
  if (!dog) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-lg mx-auto px-4 py-16 text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-soft">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-charcoal-900">Dog Profile Not Found</h1>
          <p className="text-sm text-charcoal-600 leading-relaxed">
            We could not find a registered dog associated with{' '}
            <strong className="font-mono bg-warm-200 px-1.5 py-0.5 rounded text-charcoal-900">{dogId}</strong>.
            <br />
            The QR code may be inactive, newly issued, or damaged.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/scan"
              className="px-5 py-2.5 bg-forest-800 text-white rounded-xl text-sm font-bold hover:bg-forest-900 transition-colors"
            >
              Scan Another Tag
            </Link>
            <Link
              href="/report"
              className="px-5 py-2.5 bg-white border border-warm-300 text-charcoal-800 rounded-xl text-sm font-semibold hover:bg-warm-100 transition-colors"
            >
              Report This Dog
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const vaccinationStatusColor = {
    'Vaccinated': 'bg-emerald-100 text-emerald-900 border-emerald-300',
    'Due Soon': 'bg-amber-100 text-amber-900 border-amber-300',
    'Overdue': 'bg-rose-100 text-rose-900 border-rose-300',
    'Unvaccinated': 'bg-charcoal-100 text-charcoal-800 border-charcoal-300',
    'Unknown': 'bg-warm-100 text-charcoal-700 border-warm-300',
    'Verification Required': 'bg-blue-100 text-blue-900 border-blue-300',
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>{dog.name} ({dog.dog_id}) — RescueAI Verified Health Profile</title>
        <meta
          name="description"
          content={`Public digital health and vaccination record for stray dog ${dog.name}. ID: ${dog.dog_id}. Monitored by ${dog.assigned_ngo_name}.`}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <Navbar />

      <main className="flex-1 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto px-3 sm:px-6">

          {/* Top navigation row */}
          <div className="mb-4 flex items-center justify-between text-xs">
            <Link href="/scan" className="text-charcoal-500 hover:text-charcoal-800 flex items-center gap-1 font-medium">
              <ChevronLeft className="w-4 h-4" />
              <span>Scan another collar</span>
            </Link>
            <span className="text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 font-bold uppercase text-[10px] flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Verified Record
            </span>
          </div>

          {/* ⚠️ URGENT BANNER */}
          {isUrgent && (
            <div className={`mb-4 p-4 rounded-2xl border-2 shadow-soft space-y-2 ${
              isQuarantined
                ? 'bg-rose-50 border-rose-400 text-rose-900'
                : 'bg-orange-50 border-orange-400 text-orange-900'
            }`}>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-bounce" />
                <h2 className="font-black text-sm uppercase tracking-wide">
                  {isQuarantined ? '⚠️ QUARANTINE PROTOCOL ACTIVE' : '🚨 URGENT MEDICAL ALERT'}
                </h2>
              </div>
              <p className="text-xs leading-relaxed">
                {isQuarantined
                  ? 'This dog is under mandatory 10-day veterinary quarantine observation. DO NOT feed, touch, or displace this dog. Contact animal control immediately.'
                  : 'This dog requires urgent veterinary attention. Please notify the NGO helpline or call animal control immediately.'}
              </p>
              <a
                href="tel:18005557297"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-xl shadow hover:bg-rose-700"
              >
                <Phone className="w-3.5 h-3.5" />
                Call Emergency Helpline
              </a>
            </div>
          )}

          {/* ─── MAIN CARD ─── */}
          <div className="bg-white rounded-3xl border border-warm-200 shadow-soft overflow-hidden">

            {/* Dog Photo */}
            <div className="relative h-64 sm:h-80 w-full bg-charcoal-900">
              <img
                src={dog.photo_url}
                alt={`${dog.name} — stray dog`}
                className="w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

              {/* Status badges top-left */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                <StatusBadge status={dog.vaccination_status} type="vaccination" />
                <StatusBadge status={dog.health_status} type="health" />
              </div>

              {/* QR tag top-right */}
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-[10px] font-mono font-bold text-charcoal-900 shadow flex items-center gap-1">
                <QrCode className="w-3 h-3 text-forest-800" />
                {dog.qr_tag_id}
              </div>

              {/* Name & info bottom-left */}
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{dog.name}</h1>
                  <span className="font-mono text-sm text-warm-200 font-bold bg-white/20 px-2 py-0.5 rounded-lg">
                    {dog.dog_id}
                  </span>
                </div>
                <p className="text-xs text-warm-200 mt-1 flex items-center gap-1.5 flex-wrap">
                  <span>{dog.breed}</span>
                  <span>•</span>
                  <span>{dog.estimated_age}</span>
                  <span>•</span>
                  <span>{dog.sex}</span>
                  {dog.sterilization_status === 'Sterilized' && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-300 font-semibold">✓ Sterilized</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Profile Body */}
            <div className="p-5 sm:p-7 space-y-6">

              {/* ── RABIES STATUS BANNER ── */}
              <div className={`rounded-2xl p-4 border ${vaccinationStatusColor[dog.vaccination_status] || 'bg-warm-50 text-charcoal-700 border-warm-200'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider">Rabies Vaccination Status</p>
                      <p className="text-lg font-black">{dog.vaccination_status}</p>
                    </div>
                  </div>
                  {lastRabiesVac?.next_due_date && (
                    <div className="text-right text-xs">
                      <p className="font-semibold">Next Booster</p>
                      <p className="font-bold">{new Date(lastRabiesVac.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                </div>
                {lastRabiesVac && (
                  <p className="text-[11px] mt-2 opacity-80">
                    Last dose: {new Date(lastRabiesVac.date_administered).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {' '}by {lastRabiesVac.veterinarian_name}
                  </p>
                )}
              </div>

              {/* ── IDENTITY GRID ── */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">Physical Appearance</span>
                  <p className="font-semibold text-charcoal-800 leading-relaxed text-[11px]">{dog.color_markings}</p>
                </div>
                <div className="p-3.5 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">Home Territory</span>
                  <p className="font-semibold text-charcoal-800 flex items-start gap-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-forest-700 flex-shrink-0 mt-0.5" />
                    <span>{dog.usual_area}</span>
                  </p>
                  <p className="text-[10px] text-charcoal-400">
                    Last seen: {new Date(dog.last_sighting_location.timestamp || dog.updated_at).toLocaleDateString('en-IN')}
                  </p>
                </div>
                {dog.microchip_id && (
                  <div className="p-3.5 rounded-2xl bg-warm-50 border border-warm-200 space-y-1 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider block">Microchip ID</span>
                    <p className="font-mono font-bold text-charcoal-900 text-xs">{dog.microchip_id}</p>
                  </div>
                )}
              </div>

              {/* ── VACCINATION RECORDS ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-2">
                    <Syringe className="w-4 h-4 text-forest-800" />
                    Vaccination History
                  </h2>
                  <span className="text-[11px] text-charcoal-500 font-medium">{dogVaccinations.length} dose{dogVaccinations.length !== 1 ? 's' : ''} recorded</span>
                </div>

                {dogVaccinations.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 text-xs text-charcoal-500 text-center">
                    No vaccination doses on record. Dog is queued for next immunization drive.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dogVaccinations.map((vac) => (
                      <div
                        key={vac.id}
                        className="p-3.5 rounded-2xl border border-warm-200 bg-white shadow-sm flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <p className="font-bold text-charcoal-900 truncate">{vac.vaccine_name}</p>
                          <p className="text-[11px] text-charcoal-500">
                            {new Date(vac.date_administered).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {' '}· {vac.veterinarian_name}
                          </p>
                          {vac.disease_targeted && (
                            <p className="text-[10px] text-teal-700 font-semibold">Protects against: {vac.disease_targeted}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            vac.status === 'Valid' || vac.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {vac.status}
                          </span>
                          {vac.next_due_date && (
                            <p className="text-[10px] text-charcoal-400 mt-0.5">
                              Next: {new Date(vac.next_due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── RECENT MEDICAL CARE ── */}
              {recentMedical.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-teal-700" />
                    Recent Veterinary Care
                  </h2>
                  <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900 space-y-2">
                    <p className="font-bold">{recentMedical[0].suspected_condition || recentMedical[0].category}</p>
                    {recentMedical[0].treatment_provided && (
                      <p className="text-charcoal-700 leading-relaxed text-[11px]">{recentMedical[0].treatment_provided}</p>
                    )}
                    <p className="text-[10px] text-charcoal-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Examined by {recentMedical[0].treating_org} on {new Date(recentMedical[0].examination_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              {/* ── LAST SIGHTING ── */}
              {dogSightings.length > 0 && (
                <div className="p-4 rounded-2xl bg-forest-50 border border-forest-200 text-xs space-y-1">
                  <p className="font-bold text-forest-900 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-forest-700" />
                    Most Recent Community Sighting
                  </p>
                  <p className="text-charcoal-700">{dogSightings[0].location?.address || dog.usual_area}</p>
                  <p className="text-[10px] text-charcoal-500">
                    Reported {new Date(dogSightings[0].reported_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {dogSightings[0].reporter_name && ` by ${dogSightings[0].reporter_name}`}
                  </p>
                </div>
              )}

              {/* ── MANAGING NGO ── */}
              <div className="pt-2 border-t border-warm-200 space-y-3 text-xs">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-charcoal-400 tracking-wider mb-0.5">
                      Managing Animal Welfare Organisation
                    </p>
                    <p className="font-bold text-charcoal-900">{dog.assigned_ngo_name || 'Paws & Hope Animal Welfare Trust'}</p>
                    <p className="text-[11px] text-charcoal-500">Official ABC Partner · Municipal Registration</p>
                  </div>
                  <a
                    href="tel:18005557297"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-forest-900 bg-forest-50 hover:bg-forest-100 rounded-xl border border-forest-200 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-forest-700" />
                    Call NGO Helpline
                  </a>
                </div>
              </div>

              {/* ── CITIZEN ACTION BUTTONS ── */}
              <div className="space-y-3 pt-2 border-t border-warm-200">
                <p className="text-xs font-bold text-charcoal-900">Spotted {dog.name}? Take action:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href={`/report?type=Injured Dog&dogId=${dog.dog_id}`}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl transition-colors shadow-sm"
                  >
                    <Heart className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>Report Health Concern</span>
                  </Link>
                  <Link
                    href={`/report?type=Dog Sighting&dogId=${dog.dog_id}`}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-forest-900 bg-forest-50 hover:bg-forest-100 border border-forest-200 rounded-2xl transition-colors shadow-sm"
                  >
                    <MapPin className="w-4 h-4 text-forest-700 flex-shrink-0" />
                    <span>Log a Sighting</span>
                  </Link>
                </div>
              </div>

              {/* ── LOGIN PROMPT for non-logged-in visitors ── */}
              {!currentUser && (
                <div className="bg-gradient-to-br from-forest-900 to-teal-900 rounded-2xl p-5 text-white space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <LogIn className="w-5 h-5 text-teal-300" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">Are you an NGO worker or veterinarian?</p>
                      <p className="text-xs text-warm-200 leading-relaxed">
                        Login to add vaccination records, medical notes, update this dog's health status, or log a precise GPS sighting.
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/login`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-bold text-forest-950 bg-white hover:bg-warm-100 rounded-xl transition-colors shadow"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login to Update Records</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* Logged In: Show Staff Action */}
              {currentUser && (currentUser.role === 'ngo_worker' || currentUser.role === 'veterinarian' || currentUser.role === 'admin') && (
                <div className="bg-forest-50 border border-forest-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-forest-700 flex-shrink-0" />
                    <p className="text-forest-900 font-semibold">
                      Signed in as {currentUser.full_name.split(' ')[0]} — Staff Access Active
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/dogs/${dog.dog_id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-forest-800 rounded-xl hover:bg-forest-900 transition-colors whitespace-nowrap"
                  >
                    Full Dossier
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Privacy / info footer */}
          <div className="mt-6 text-center text-xs text-charcoal-400 space-y-1 pb-4">
            <p className="flex items-center justify-center gap-1">
              <Info className="w-3.5 h-3.5" />
              RescueAI protects volunteer privacy. Sensitive clinical notes are restricted to authorized personnel.
            </p>
            <p>© {new Date().getFullYear()} RescueAI Animal Welfare Systems</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export const getStaticPaths: GetStaticPaths = async () => {
  const paths: { params: { dogId: string } }[] = []

  SEED_DOGS.forEach((d) => {
    paths.push({ params: { dogId: d.dog_id } })
    paths.push({ params: { dogId: d.id } })
    if (d.qr_tag_id) {
      paths.push({ params: { dogId: d.qr_tag_id } })
    }
  })

  return {
    paths,
    fallback: false
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  return {
    props: {
      dogId: params?.dogId || null
    }
  }
}

