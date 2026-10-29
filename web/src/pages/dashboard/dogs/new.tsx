import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Dog as DogIcon,
  Shield,
  QrCode,
  CheckCircle2,
  Camera,
  MapPin,
  ArrowRight,
  Printer,
  ChevronLeft
} from 'lucide-react'
import { DashboardLayout } from '../../../components/DashboardLayout'
import { useRescueAI } from '../../../lib/store'
import { PrintableCollarTag } from '../../../components/PrintableCollarTag'
import { Dog } from '../../../lib/types'

export default function NewDogPage() {
  const router = useRouter()
  const { registerDog, dogs, currentUser } = useRescueAI()

  // Calculate next sequential ID
  const nextNumber = dogs.length + 1
  const suggestedDogId = `RAI-DOG-${String(nextNumber).padStart(4, '0')}`
  const suggestedTagId = `TAG-RAI-${String(nextNumber).padStart(4, '0')}`

  const [dogId, setDogId] = useState(suggestedDogId)
  const [tagId, setTagId] = useState(suggestedTagId)
  const [name, setName] = useState('')
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80')
  const [breed, setBreed] = useState('Indie / Street Mix')
  const [estimatedAge, setEstimatedAge] = useState('2 years')
  const [sex, setSex] = useState<'Male' | 'Female' | 'Unknown'>('Male')
  const [colorMarkings, setColorMarkings] = useState('')
  const [sterilizationStatus, setSterilizationStatus] = useState<'Sterilized' | 'Intact' | 'Unknown'>('Sterilized')
  const [healthStatus, setHealthStatus] = useState<'Healthy' | 'Needs Treatment' | 'Critical' | 'Under Observation' | 'Quarantined'>('Healthy')
  const [vaccinationStatus, setVaccinationStatus] = useState<'Vaccinated' | 'Due Soon' | 'Overdue' | 'Unvaccinated' | 'Unknown' | 'Verification Required'>('Unvaccinated')
  const [dateRegistered, setDateRegistered] = useState(new Date().toISOString().split('T')[0])
  const [usualArea, setUsualArea] = useState('')
  const [microchipId, setMicrochipId] = useState('')
  const [notes, setNotes] = useState('')
  const [createdDog, setCreatedDog] = useState<Dog | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const photoPresets = [
    { label: 'Golden Brown Indie', url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80' },
    { label: 'Fawn & Black Muzzle', url: 'https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80' },
    { label: 'Black Street Mix', url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80' },
    { label: 'White / Brindle Pup', url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&auto=format&fit=crop&q=80' },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!colorMarkings.trim()) {
      setErrorMsg('Please describe physical colors and markings (essential for field identification).')
      return
    }

    if (!usualArea.trim()) {
      setErrorMsg('Please enter the usual area or territory.')
      return
    }

    // Check duplicate dogId
    if (dogs.some((d) => d.dog_id.toLowerCase() === dogId.trim().toLowerCase())) {
      setErrorMsg(`Dog ID ${dogId} is already in use. Please select a unique identifier.`)
      return
    }

    const { success, dog } = registerDog({
      dog_id: dogId.trim(),
      qr_tag_id: tagId.trim(),
      name: name.trim() || 'Community Dog',
      photo_url: photoUrl.trim(),
      breed: breed.trim(),
      estimated_age: estimatedAge.trim(),
      sex,
      color_markings: colorMarkings.trim(),
      sterilization_status: sterilizationStatus,
      health_status: healthStatus,
      vaccination_status: vaccinationStatus,
      date_registered: dateRegistered,
      usual_area: usualArea.trim(),
      last_sighting_location: {
        lat: 28.5355,
        lng: 77.3910,
        address: usualArea.trim(),
        timestamp: new Date().toISOString(),
      },
      microchip_id: microchipId.trim() || undefined,
      notes: notes.trim(),
    })

    if (success) {
      setCreatedDog(dog)
    }
  }

  return (
    <DashboardLayout
      title="Register Stray Dog Profile"
      subtitle="Create a new digital identity and generate an active QR collar tag"
      actions={
        <Link
          href="/dashboard/dogs"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Registry</span>
        </Link>
      }
    >
      <Head>
        <title>Register Dog — RescueAI</title>
      </Head>

      <div className="max-w-3xl mx-auto">
        {createdDog ? (
          /* SUCCESS STATE: Display QR Collar Tag & Print Action */
          <div className="bg-white rounded-3xl border border-warm-200 p-8 shadow-soft text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-forest-950">
                {createdDog.name} Successfully Registered!
              </h2>
              <p className="text-xs text-charcoal-500">
                Digital Profile <strong className="font-mono text-charcoal-900">{createdDog.dog_id}</strong> is active and linked to QR collar tag <strong className="font-mono text-teal-800">{createdDog.qr_tag_id}</strong>.
              </p>
            </div>

            {/* Render Printable Collar Tag */}
            <div className="pt-2">
              <PrintableCollarTag dog={createdDog} />
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/dashboard/dogs/${createdDog.dog_id}`}
                className="px-6 py-3 bg-forest-800 text-white rounded-xl text-xs font-bold hover:bg-forest-900 shadow-soft"
              >
                Open Full Dog Profile
              </Link>
              <Link
                href="/dashboard/dogs"
                className="px-6 py-3 bg-white border border-warm-300 text-charcoal-800 rounded-xl text-xs font-bold hover:bg-warm-100"
              >
                Return to Dog Registry
              </Link>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM */
          <div className="bg-white rounded-3xl border border-warm-200 p-6 sm:p-10 shadow-soft space-y-6">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* SECTION 1: IDENTIFIERS */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-warm-200 pb-2">
                  <QrCode className="w-4 h-4 text-forest-800" />
                  <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wide">
                    1. Identifiers & Tag Assignment
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 uppercase tracking-wider text-[11px]">
                      Unique Dog ID (Auto-generated) *
                    </label>
                    <input
                      type="text"
                      required
                      value={dogId}
                      onChange={(e) => setDogId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 font-mono text-sm font-bold text-charcoal-900 bg-warm-50 focus:outline-none focus:ring-2 focus:ring-forest-600"
                    />
                    <p className="text-[10px] text-charcoal-400">Guaranteed unique canine identity number.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 uppercase tracking-wider text-[11px]">
                      Collar Tag Identifier *
                    </label>
                    <input
                      type="text"
                      required
                      value={tagId}
                      onChange={(e) => setTagId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 font-mono text-sm font-bold text-teal-800 bg-warm-50 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <p className="text-[10px] text-charcoal-400">Engraved on the physical collar tag.</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PHYSICAL TRAITS */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-warm-200 pb-2">
                  <DogIcon className="w-4 h-4 text-forest-800" />
                  <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wide">
                    2. Physical Profile & Appearance
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">Dog Name or Alias</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Bruno (or leave empty if unknown)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">Estimated Age</label>
                    <input
                      type="text"
                      value={estimatedAge}
                      onChange={(e) => setEstimatedAge(e.target.value)}
                      placeholder="e.g. 2 years, 6 months"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">Sex</label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">Breed / Mix</label>
                    <input
                      type="text"
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      placeholder="e.g. Indie / Street Mix"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">Sterilisation Status</label>
                    <select
                      value={sterilizationStatus}
                      onChange={(e) => setSterilizationStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Sterilized">Sterilized (Ear-notched)</option>
                      <option value="Intact">Intact</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700 text-[11px]">
                    Colour & Identifying Markings *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={colorMarkings}
                    onChange={(e) => setColorMarkings(e.target.value)}
                    placeholder="e.g. Golden brown coat with white chest patch, left ear notched, white front left paw"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                  />
                </div>

                {/* Photo selection */}
                <div className="space-y-2">
                  <label className="font-bold text-charcoal-700 text-[11px]">Dog Photograph URL</label>
                  <input
                    type="text"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm font-mono"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-charcoal-500">
                    <span>Quick presets:</span>
                    {photoPresets.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setPhotoUrl(p.url)}
                        className="px-2 py-0.5 bg-warm-100 hover:bg-forest-100 hover:text-forest-900 rounded text-charcoal-700 font-medium transition-colors"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION 3: HEALTH & LOCATION */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 border-b border-warm-200 pb-2">
                  <MapPin className="w-4 h-4 text-forest-800" />
                  <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wide">
                    3. Territory Location & Health Status
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">
                      General Area / Territory *
                    </label>
                    <input
                      type="text"
                      required
                      value={usualArea}
                      onChange={(e) => setUsualArea(e.target.value)}
                      placeholder="e.g. Sector 14 Central Park & Market"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">Microchip ID (Optional)</label>
                    <input
                      type="text"
                      value={microchipId}
                      onChange={(e) => setMicrochipId(e.target.value)}
                      placeholder="e.g. 985141002341901"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">General Health Condition</label>
                    <select
                      value={healthStatus}
                      onChange={(e) => setHealthStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Healthy">Healthy</option>
                      <option value="Needs Treatment">Needs Treatment (Limping, rash, cut)</option>
                      <option value="Under Observation">Under Observation (Post-op / ABC)</option>
                      <option value="Critical">Critical</option>
                      <option value="Quarantined">Quarantined (Suspected Rabies)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700 text-[11px]">Initial Vaccination Status</label>
                    <select
                      value={vaccinationStatus}
                      onChange={(e) => setVaccinationStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Unvaccinated">Unvaccinated (Queued for dose)</option>
                      <option value="Vaccinated">Vaccinated (Valid proof)</option>
                      <option value="Verification Required">Verification Required</option>
                      <option value="Due Soon">Due Soon</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700 text-[11px]">Field Worker Notes & Observations</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Temperament notes, feeding habits, community caretakers..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm"
                  />
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4 border-t border-warm-200">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm shadow-soft transition-all flex items-center justify-center gap-2"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Generate Digital Identity & Collar Tag</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
