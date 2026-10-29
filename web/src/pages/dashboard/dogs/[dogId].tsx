import React, { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import {
  Dog as DogIcon,
  Shield,
  QrCode,
  Syringe,
  Stethoscope,
  Activity,
  MapPin,
  Calendar,
  AlertTriangle,
  Printer,
  Download,
  Plus,
  Edit3,
  ExternalLink,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Heart,
  Tag,
  FileText,
  UserCheck
} from 'lucide-react'
import { DashboardLayout } from '../../../components/DashboardLayout'
import { useRescueAI } from '../../../lib/store'
import { StatusBadge } from '../../../components/StatusBadge'
import { PrintableCollarTag } from '../../../components/PrintableCollarTag'
import { VaccinationRecord, MedicalRecord, HealthObservation } from '../../../lib/types'

export default function IndividualDogProfilePage() {
  const router = useRouter()
  const { dogId } = router.query

  const {
    dogs,
    vaccinations,
    medicalRecords,
    observations,
    sightings,
    devices,
    communityReports,
    updateDog,
    addVaccinationRecord,
    addMedicalRecord,
    addObservation,
    replaceQRTag,
    currentUser,
  } = useRescueAI()

  const dog = dogs.find(
    (d) =>
      d.dog_id.toLowerCase() === String(dogId).toLowerCase() ||
      d.id === String(dogId)
  )

  const [activeTab, setActiveTab] = useState<
    'overview' | 'vaccination' | 'medical' | 'activity' | 'location' | 'device' | 'notes'
  >('overview')

  // Modals
  const [showTagModal, setShowTagModal] = useState(false)
  const [showAddVacModal, setShowAddVacModal] = useState(false)
  const [showAddMedModal, setShowAddMedModal] = useState(false)
  const [showAddObsModal, setShowAddObsModal] = useState(false)
  const [showReplaceTagModal, setShowReplaceTagModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  // Add Vaccination State
  const [vacName, setVacName] = useState('Nobivac Rabies (Inactivated)')
  const [vacDisease, setVacDisease] = useState('Rabies Virus')
  const [vacDate, setVacDate] = useState(new Date().toISOString().split('T')[0])
  const [vacNextDate, setVacNextDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [vacDose, setVacDose] = useState('1.0 ml Subcutaneous')
  const [vacBatch, setVacBatch] = useState('NR-9821')
  const [vacNotes, setVacNotes] = useState('')
  const [vacDupWarning, setVacDupWarning] = useState(false)

  // Add Medical State
  const [medCategory, setMedCategory] = useState<MedicalRecord['category']>('Routine examination')
  const [medSymptoms, setMedSymptoms] = useState('')
  const [medCondition, setMedCondition] = useState('')
  const [medTreatment, setMedTreatment] = useState('')
  const [medMedication, setMedMedication] = useState('')
  const [medRecovery, setMedRecovery] = useState<MedicalRecord['recovery_status']>('Improving')
  const [medUrgent, setMedUrgent] = useState(false)

  // Add Observation State
  const [obsBehavior, setObsBehavior] = useState<HealthObservation['activity_behavior']>('Normal & Energetic')
  const [obsAppetite, setObsAppetite] = useState<HealthObservation['appetite']>('Normal')
  const [obsMobility, setObsMobility] = useState<HealthObservation['mobility']>('Normal')
  const [obsTemp, setObsTemp] = useState('38.5')
  const [obsWeight, setObsWeight] = useState('18.0')
  const [obsNotes, setObsNotes] = useState('')

  // Replace Tag State
  const [newTagCode, setNewTagCode] = useState(`TAG-RAI-${Math.floor(1000 + Math.random() * 9000)}-R`)
  const [replaceReason, setReplaceReason] = useState('Collar tag scratched / worn out')

  // Edit Dog State
  const [editName, setEditName] = useState('')
  const [editArea, setEditArea] = useState('')
  const [editHealth, setEditHealth] = useState<any>('Healthy')
  const [editSterilization, setEditSterilization] = useState<any>('Sterilized')

  if (!dog && router.isReady) {
    return (
      <DashboardLayout title="Dog Not Found">
        <div className="bg-white rounded-3xl p-12 border border-warm-200 text-center max-w-md mx-auto space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto" />
          <h2 className="text-xl font-bold text-charcoal-900">Dog Record Not Found</h2>
          <p className="text-xs text-charcoal-500">
            No dog record matches the identifier <strong className="font-mono">{dogId}</strong>.
          </p>
          <Link
            href="/dashboard/dogs"
            className="inline-block px-4 py-2 bg-forest-800 text-white rounded-xl text-xs font-semibold"
          >
            Return to Registry
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  if (!dog) {
    return (
      <DashboardLayout>
        <div className="p-12 text-center text-xs text-charcoal-500">Loading Dog Record...</div>
      </DashboardLayout>
    )
  }

  const dogVacs = vaccinations.filter((v) => v.dog_id === dog.dog_id)
  const dogMeds = medicalRecords.filter((m) => m.dog_id === dog.dog_id)
  const dogObs = observations.filter((o) => o.dog_id === dog.dog_id)
  const dogSightings = sightings.filter((s) => s.dog_id === dog.dog_id)
  const dogDevice = devices.find((dev) => dev.dog_id === dog.dog_id && dev.qr_status === 'Active') || devices.find((dev) => dev.dog_id === dog.dog_id)
  const dogReports = communityReports.filter((r) => r.dog_id === dog.dog_id)

  const handleCreateVaccination = (e: React.FormEvent) => {
    e.preventDefault()
    const result = addVaccinationRecord({
      dog_id: dog.dog_id,
      vaccine_name: vacName,
      disease_targeted: vacDisease,
      date_administered: vacDate,
      next_due_date: vacNextDate || undefined,
      dose_info: vacDose,
      veterinarian_name: currentUser?.full_name || 'Dr. Arun Patel, DVM',
      veterinary_org: currentUser?.organisation_name || 'Metro City Veterinary Clinic',
      batch_number: vacBatch,
      notes: vacNotes,
      status: 'Valid',
    })

    if (result.isDuplicateWarning) {
      alert(`Safety Notice: A recent vaccination for ${vacName} was already logged within the last 60 days. The record has been saved with a duplicate review flag.`)
    }
    setShowAddVacModal(false)
  }

  const handleCreateMedical = (e: React.FormEvent) => {
    e.preventDefault()
    addMedicalRecord({
      dog_id: dog.dog_id,
      examination_date: new Date().toISOString().split('T')[0],
      category: medCategory,
      symptoms: medSymptoms ? [medSymptoms] : ['None observed'],
      suspected_condition: medCondition || medCategory,
      treatment_provided: medTreatment || 'Routine examination and preventative checkup',
      medication_details: medMedication,
      veterinarian_name: currentUser?.full_name || 'Dr. Arun Patel, DVM',
      treating_org: currentUser?.organisation_name || 'Metro City Veterinary Clinic',
      recovery_status: medRecovery,
      urgent_escalation: medUrgent,
      notes: medUrgent ? 'URGENT: Quarantine escalation protocol flagged by veterinarian.' : '',
    })
    setShowAddMedModal(false)
  }

  const handleCreateObservation = (e: React.FormEvent) => {
    e.preventDefault()
    addObservation({
      dog_id: dog.dog_id,
      activity_behavior: obsBehavior,
      appetite: obsAppetite,
      mobility: obsMobility,
      general_condition: 'Good',
      body_temperature_c: parseFloat(obsTemp) || 38.5,
      weight_kg: parseFloat(obsWeight) || 18.0,
      observer_name: currentUser?.full_name || 'Field Worker',
      observer_role: currentUser?.role || 'ngo_worker',
      notes: obsNotes,
      triage_level: obsMobility === 'Limping' ? 'Needs Attention' : 'Normal',
    })
    setShowAddObsModal(false)
  }

  const handleReplaceTag = (e: React.FormEvent) => {
    e.preventDefault()
    replaceQRTag(dog.dog_id, newTagCode, replaceReason)
    setShowReplaceTagModal(false)
    alert(`Collar tag successfully replaced with ${newTagCode}. Previous tag is deactivated.`)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    updateDog(dog.id, {
      name: editName || dog.name,
      usual_area: editArea || dog.usual_area,
      health_status: editHealth,
      sterilization_status: editSterilization,
    })
    setShowEditModal(false)
  }

  const openEditModal = () => {
    setEditName(dog.name)
    setEditArea(dog.usual_area)
    setEditHealth(dog.health_status)
    setEditSterilization(dog.sterilization_status)
    setShowEditModal(true)
  }

  return (
    <DashboardLayout
      title={`${dog.name} (${dog.dog_id})`}
      subtitle="Complete canine clinical records, QR collar device, and field history"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTagModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-forest-900 bg-forest-50 hover:bg-forest-100 border border-forest-200 rounded-xl transition-colors"
          >
            <QrCode className="w-4 h-4 text-forest-700" />
            <span>Collar Tag</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl"
            title="Print Full Clinical Dog Record"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Profile</span>
          </button>
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      }
    >
      <Head>
        <title>{dog.name} ({dog.dog_id}) — Digital Dog Profile</title>
      </Head>

      <div className="space-y-6">
        {/* TOP PROFILE HEADER CARD */}
        <div className="bg-white rounded-3xl border border-warm-200 p-6 sm:p-8 shadow-soft">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Dog Photo */}
            <div className="relative w-full md:w-56 h-56 rounded-2xl overflow-hidden bg-charcoal-900 flex-shrink-0 shadow-sm">
              <img
                src={dog.photo_url}
                alt={dog.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 flex gap-1">
                <StatusBadge status={dog.vaccination_status} type="vaccination" size="sm" />
              </div>
            </div>

            {/* Profile Bio */}
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-2xl sm:text-3xl font-black text-charcoal-900">{dog.name}</h1>
                    <span className="font-mono text-xs font-bold bg-warm-100 text-charcoal-800 px-2.5 py-1 rounded-lg border border-warm-300">
                      {dog.dog_id}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>{dog.breed}</span>
                    <span>•</span>
                    <span>{dog.estimated_age}</span>
                    <span>•</span>
                    <span>{dog.sex}</span>
                    <span>•</span>
                    <span className="font-semibold text-teal-800">{dog.sterilization_status}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={dog.health_status} type="health" />
                  <a
                    href={`/dog/${dog.dog_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 rounded-xl border border-teal-200"
                  >
                    <span>Public View</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Quick Details Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-warm-100 text-xs">
                <div>
                  <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">
                    Territory
                  </span>
                  <span className="font-semibold text-charcoal-800 truncate block">
                    {dog.usual_area}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">
                    Collar Tag ID
                  </span>
                  <span className="font-mono font-bold text-teal-800 truncate block">
                    {dog.qr_tag_id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">
                    Microchip ID
                  </span>
                  <span className="font-mono text-charcoal-600 truncate block">
                    {dog.microchip_id || 'None Registered'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-charcoal-400 font-bold uppercase tracking-wider block">
                    Managing NGO
                  </span>
                  <span className="font-semibold text-forest-900 truncate block">
                    {dog.assigned_ngo_name || 'Paws & Hope Trust'}
                  </span>
                </div>
              </div>

              {/* Physical Markings */}
              <div className="p-3 bg-warm-50 rounded-xl text-xs text-charcoal-700 leading-relaxed border border-warm-200">
                <strong>Physical Markings:</strong> {dog.color_markings}
              </div>
            </div>
          </div>
        </div>

        {/* 7 PROFILE TABS NAVIGATION */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-warm-200 pb-px text-xs font-semibold">
          {[
            { id: 'overview', label: 'Overview', icon: DogIcon },
            { id: 'vaccination', label: `Vaccinations (${dogVacs.length})`, icon: Syringe },
            { id: 'medical', label: `Medical History (${dogMeds.length})`, icon: Stethoscope },
            { id: 'activity', label: `Activity & Vitals (${dogObs.length})`, icon: Activity },
            { id: 'location', label: `Location (${dogSightings.length})`, icon: MapPin },
            { id: 'device', label: 'QR & Collar Tag', icon: Tag },
            { id: 'notes', label: `Reports & Notes (${dogReports.length})`, icon: FileText },
          ].map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'border-forest-800 text-forest-900 bg-white rounded-t-xl'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal-900 hover:border-warm-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-forest-800' : 'text-charcoal-400'}`} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {/* Medical Summary */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wide">
                    Vaccination & Clinical Snapshot
                  </h3>
                  <button
                    onClick={() => setShowAddVacModal(true)}
                    className="text-xs font-bold text-forest-800 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Record Vaccination
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-charcoal-400">Next Booster Due</span>
                    <p className="text-base font-black text-forest-900">
                      {dogVacs.length > 0 && dogVacs[0].next_due_date
                        ? new Date(dogVacs[0].next_due_date).toLocaleDateString()
                        : 'No booster scheduled'}
                    </p>
                    <p className="text-[11px] text-charcoal-500">
                      {dog.vaccination_status === 'Vaccinated'
                        ? 'Immunization verified'
                        : 'Needs field clinic follow-up'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-charcoal-400">Total Clinical Exams</span>
                    <p className="text-base font-black text-teal-900">{dogMeds.length} Visits Logged</p>
                    <p className="text-[11px] text-charcoal-500">
                      Last exam: {dogMeds.length > 0 ? new Date(dogMeds[0].examination_date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {dog.notes && (
                  <div className="p-4 rounded-2xl bg-warm-50/50 border border-warm-200 text-xs">
                    <span className="font-bold text-charcoal-800 block mb-1">Field Observations & Temperament:</span>
                    <p className="text-charcoal-600 leading-relaxed">{dog.notes}</p>
                  </div>
                )}
              </div>

              {/* Timeline of Recent Activity */}
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-soft space-y-4">
                <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wide">
                  Recent Activity Timeline
                </h3>

                <div className="space-y-4 text-xs">
                  {dogVacs.slice(0, 2).map((vac) => (
                    <div key={vac.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center flex-shrink-0">
                        <Syringe className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-charcoal-900">{vac.vaccine_name} Administered</p>
                        <p className="text-charcoal-500 text-[11px]">
                          {new Date(vac.date_administered).toLocaleDateString()} • {vac.veterinarian_name} ({vac.veterinary_org})
                        </p>
                      </div>
                    </div>
                  ))}

                  {dogMeds.slice(0, 2).map((med) => (
                    <div key={med.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-charcoal-900">Medical Exam: {med.category}</p>
                        <p className="text-charcoal-500 text-[11px]">
                          {new Date(med.examination_date).toLocaleDateString()} • {med.treatment_provided}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: QR Collar Tag Widget */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-soft text-center space-y-4">
                <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wide">
                  Active QR Collar
                </h3>

                <div className="w-44 h-44 mx-auto p-3 bg-white border-2 border-forest-800 rounded-2xl shadow-inner flex items-center justify-center">
                  <QRCodeSVG
                    value={`https://rescueai.org/dog/${dog.dog_id}`}
                    size={150}
                    level="H"
                  />
                </div>

                <div className="space-y-1">
                  <p className="font-mono text-sm font-black text-charcoal-950">{dog.qr_tag_id}</p>
                  <p className="text-[11px] text-teal-700 font-semibold">Status: Active Weatherproof Tag</p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setShowTagModal(true)}
                    className="w-full py-2.5 px-3 bg-forest-800 text-white rounded-xl text-xs font-bold hover:bg-forest-900 shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Collar Tag Layout</span>
                  </button>
                  <button
                    onClick={() => setShowReplaceTagModal(true)}
                    className="w-full py-2 px-3 bg-warm-100 hover:bg-warm-200 text-charcoal-700 rounded-xl text-xs font-semibold"
                  >
                    Issue Replacement Tag
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VACCINATIONS */}
        {activeTab === 'vaccination' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Vaccination Management</h3>
                <p className="text-xs text-charcoal-500">Track core canine immunization records and prevent duplicate doses</p>
              </div>
              <button
                onClick={() => setShowAddVacModal(true)}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow-soft flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Record Vaccination</span>
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-warm-200 shadow-soft overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-warm-100 text-charcoal-600 uppercase font-bold text-[10px] tracking-wider border-b border-warm-200">
                  <tr>
                    <th className="py-3.5 px-4">Vaccine & Disease</th>
                    <th className="py-3.5 px-4">Administered Date</th>
                    <th className="py-3.5 px-4">Next Due Date</th>
                    <th className="py-3.5 px-4">Batch Number</th>
                    <th className="py-3.5 px-4">Veterinarian</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {dogVacs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-charcoal-400">
                        No vaccination records found for this dog.
                      </td>
                    </tr>
                  ) : (
                    dogVacs.map((vac) => (
                      <tr key={vac.id} className="hover:bg-warm-50/70">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-charcoal-900">{vac.vaccine_name}</p>
                          <p className="text-[11px] text-charcoal-500">{vac.disease_targeted}</p>
                        </td>
                        <td className="py-3.5 px-4 font-medium">
                          {new Date(vac.date_administered).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-forest-900">
                          {vac.next_due_date ? new Date(vac.next_due_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-charcoal-600">
                          {vac.batch_number || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 text-charcoal-700">
                          <p className="font-semibold">{vac.veterinarian_name}</p>
                          <p className="text-[10px] text-charcoal-400">{vac.veterinary_org}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vac.status === 'Duplicate_Flagged'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {vac.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MEDICAL HISTORY */}
        {activeTab === 'medical' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Clinical Medical History</h3>
                <p className="text-xs text-charcoal-500">Veterinary examinations, injuries, surgeries, and recovery logs</p>
              </div>
              <button
                onClick={() => setShowAddMedModal(true)}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow-soft flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medical Examination</span>
              </button>
            </div>

            {/* Rabies Escalation Alert if Quarantined */}
            {dog.health_status === 'Quarantined' && (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                  <h4 className="font-black uppercase tracking-wide">
                    Mandatory 10-Day Rabies Quarantine Active
                  </h4>
                </div>
                <p className="leading-relaxed">
                  This canine has been flagged under suspected rabies exposure or quarantine protocol. Daily visual symptom evaluation is mandatory.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {dogMeds.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-warm-200 text-center text-xs text-charcoal-500">
                  No medical visits logged yet for this dog.
                </div>
              ) : (
                dogMeds.map((med) => (
                  <div
                    key={med.id}
                    className={`bg-white rounded-3xl p-6 border shadow-2xs space-y-3 ${
                      med.urgent_escalation ? 'border-rose-400 bg-rose-50/20' : 'border-warm-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-charcoal-900">{med.category}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warm-100 text-charcoal-700">
                          {med.recovery_status}
                        </span>
                      </div>
                      <span className="text-xs text-charcoal-500">
                        Exam Date: {new Date(med.examination_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-charcoal-400 block mb-0.5">
                          Suspected / Diagnosed Condition
                        </span>
                        <p className="font-semibold text-charcoal-800">{med.suspected_condition}</p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-charcoal-400 block mb-0.5">
                          Treatment Provided
                        </span>
                        <p className="text-charcoal-700">{med.treatment_provided}</p>
                      </div>
                    </div>

                    {med.medication_details && (
                      <div className="p-3 bg-warm-50 rounded-xl text-xs text-charcoal-700">
                        <strong>Prescriptions & Dosages:</strong> {med.medication_details}
                      </div>
                    )}

                    <div className="pt-2 border-t border-warm-100 flex items-center justify-between text-[11px] text-charcoal-500">
                      <span>Examined by {med.veterinarian_name} ({med.treating_org})</span>
                      {med.follow_up_date && (
                        <span className="font-semibold text-teal-800">
                          Follow-up: {new Date(med.follow_up_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ACTIVITY & VITALS */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Activity & Physical Vitals</h3>
                <p className="text-xs text-charcoal-500">Manually logged clinical observations during field health inspections</p>
              </div>
              <button
                onClick={() => setShowAddObsModal(true)}
                className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow-soft flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Log Vitals</span>
              </button>
            </div>

            {/* Disclaimer banner */}
            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-teal-950 text-xs leading-relaxed">
              <strong>Notice:</strong> The QR collar is an identification device. All body temperatures, heart rates, and weights are physical measurements recorded by veterinary or NGO personnel.
            </div>

            <div className="space-y-3">
              {dogObs.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-warm-200 text-center text-xs text-charcoal-500">
                  No vital measurements recorded yet.
                </div>
              ) : (
                dogObs.map((obs) => (
                  <div
                    key={obs.id}
                    className="bg-white rounded-2xl p-5 border border-warm-200 shadow-2xs space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-charcoal-900">{obs.activity_behavior}</span>
                        <StatusBadge status={obs.triage_level} size="sm" />
                      </div>
                      <span className="text-charcoal-400">
                        {new Date(obs.recorded_at).toLocaleDateString()} by {obs.observer_name}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-charcoal-700 bg-warm-50 p-3 rounded-xl">
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Temperature</span>
                        <span className="font-mono font-bold text-sm">{obs.body_temperature_c ? `${obs.body_temperature_c}°C` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Weight</span>
                        <span className="font-mono font-bold text-sm">{obs.weight_kg ? `${obs.weight_kg} kg` : 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Mobility</span>
                        <span className="font-semibold text-sm">{obs.mobility}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Appetite</span>
                        <span className="font-semibold text-sm">{obs.appetite}</span>
                      </div>
                    </div>

                    {obs.notes && <p className="text-charcoal-600 text-[11px] leading-relaxed">{obs.notes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LOCATION HISTORY */}
        {activeTab === 'location' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Recorded Sighting History</h3>
                <p className="text-xs text-charcoal-500">Confirmed community locations and field reports</p>
              </div>
              <Link
                href="/dashboard/map"
                className="text-xs font-bold text-teal-700 hover:underline flex items-center gap-1"
              >
                <span>Open Interactive Map</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {dogSightings.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-warm-200 text-center text-xs text-charcoal-500">
                  Initial registration territory: <strong>{dog.usual_area}</strong>. No additional field sightings recorded.
                </div>
              ) : (
                dogSightings.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl p-4 border border-warm-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-charcoal-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-forest-700" />
                        <span>{s.location.address}</span>
                      </p>
                      <span className="text-charcoal-400 text-[11px]">
                        {new Date(s.reported_at).toLocaleString()}
                      </span>
                    </div>
                    {s.health_observation && (
                      <p className="text-charcoal-600 text-[11px] pl-5">{s.health_observation}</p>
                    )}
                    <p className="text-[10px] text-charcoal-400 pl-5">Reported by: {s.reporter_type} {s.reporter_name ? `(${s.reporter_name})` : ''}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: QR & COLLAR TAG */}
        {activeTab === 'device' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-charcoal-900">QR Collar Hardware Management</h3>
                  <p className="text-xs text-charcoal-500">Current device status, scan logs, and replacement records</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTagModal(true)}
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white rounded-xl text-xs font-bold shadow-soft flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Collar Tag</span>
                  </button>
                  <button
                    onClick={() => setShowReplaceTagModal(true)}
                    className="px-4 py-2 bg-white border border-warm-300 text-charcoal-700 rounded-xl text-xs font-bold hover:bg-warm-100"
                  >
                    Replace Damaged Tag
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-400">Tag ID</span>
                  <p className="font-mono text-base font-black text-teal-900">{dog.qr_tag_id}</p>
                  <p className="text-[10px] text-charcoal-500">Issued: {dog.date_registered}</p>
                </div>

                <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-400">Scan Count</span>
                  <p className="font-mono text-base font-black text-forest-900">
                    {dogDevice?.scan_count || 42} Citizen Scans
                  </p>
                  <p className="text-[10px] text-charcoal-500">
                    Last: {dogDevice?.last_scanned_at ? new Date(dogDevice.last_scanned_at).toLocaleDateString() : 'Recent'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-charcoal-400">Device Condition</span>
                  <p className="text-base font-bold text-charcoal-800">
                    {dogDevice?.device_condition || 'Good'}
                  </p>
                  <p className="text-[10px] text-charcoal-500">Anodized Weatherproof Aluminum</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 text-xs space-y-2">
                <span className="font-bold text-charcoal-900">Stable Profile Destination:</span>
                <p className="font-mono text-[11px] text-teal-800 break-all bg-white p-2.5 rounded-lg border border-warm-300">
                  https://rescueai.org/dog/{dog.dog_id}
                </p>
                <p className="text-[11px] text-charcoal-500">
                  Encodes only the stable URL route. Changing vaccines, medical conditions, or photos updates the webpage without replacing the physical collar.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: COMMUNITY REPORTS */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Community Reports Linked to {dog.name}</h3>
                <p className="text-xs text-charcoal-500">Citizen submissions regarding injuries, sightings, or missing tags</p>
              </div>
              <Link
                href={`/report?dogId=${dog.dog_id}`}
                className="text-xs font-bold text-forest-800 hover:underline"
              >
                + Submit Citizen Report
              </Link>
            </div>

            <div className="space-y-3">
              {dogReports.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-warm-200 text-center text-xs text-charcoal-500">
                  No community reports currently linked to {dog.dog_id}.
                </div>
              ) : (
                dogReports.map((rep) => (
                  <div key={rep.id} className="bg-white rounded-2xl p-5 border border-warm-200 shadow-2xs space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-forest-900">{rep.reference_number}</span>
                      <StatusBadge status={rep.status} size="sm" />
                    </div>
                    <p className="font-bold text-charcoal-900">{rep.report_type}</p>
                    <p className="text-charcoal-600 leading-relaxed">{rep.description}</p>
                    {rep.internal_notes && (
                      <div className="p-2.5 bg-warm-50 rounded-lg text-charcoal-700 text-[11px]">
                        <strong>Internal Staff Notes:</strong> {rep.internal_notes}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* MODAL: Printable Collar Tag */}
        {showTagModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl">
              <PrintableCollarTag dog={dog} onClose={() => setShowTagModal(false)} />
            </div>
          </div>
        )}

        {/* MODAL: Add Vaccination */}
        {showAddVacModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Record Vaccination Dose</h3>

              <form onSubmit={handleCreateVaccination} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Vaccine Formulation *</label>
                  <select
                    value={vacName}
                    onChange={(e) => {
                      setVacName(e.target.value)
                      if (e.target.value.includes('Rabies')) setVacDisease('Rabies Virus')
                      else if (e.target.value.includes('DHPP')) setVacDisease('Core 7-in-1 Canine Spectrum')
                      else setVacDisease('Parasitic / Core')
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    <option value="Nobivac Rabies (Inactivated)">Nobivac Rabies (Inactivated)</option>
                    <option value="Defensor 3 Rabies Vaccine">Defensor 3 Rabies Vaccine</option>
                    <option value="Canigen DHPPi/L (7-in-1)">Canigen DHPPi/L (7-in-1 Core Combination)</option>
                    <option value="Drontal Plus Deworming">Drontal Plus Broad-Spectrum Deworming</option>
                    <option value="Bravecto Anti-Tick & Flea">Bravecto Anti-Tick & Flea Oral Dose</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Administration Date *</label>
                    <input
                      type="date"
                      required
                      value={vacDate}
                      onChange={(e) => setVacDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Next Booster Due</label>
                    <input
                      type="date"
                      value={vacNextDate}
                      onChange={(e) => setVacNextDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Dose Quantity</label>
                    <input
                      type="text"
                      value={vacDose}
                      onChange={(e) => setVacDose(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Manufacturer Batch #</label>
                    <input
                      type="text"
                      value={vacBatch}
                      onChange={(e) => setVacBatch(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddVacModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Save Vaccine Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Add Medical Record */}
        {showAddMedModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Add Clinical Examination</h3>

              <form onSubmit={handleCreateMedical} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Category *</label>
                    <select
                      value={medCategory}
                      onChange={(e) => setMedCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Routine examination">Routine examination</option>
                      <option value="Injury">Injury (wound, bite, fracture)</option>
                      <option value="Skin condition">Skin condition (Mange, flea)</option>
                      <option value="Infection">Infection / Fever</option>
                      <option value="Suspected rabies exposure">Suspected rabies exposure</option>
                      <option value="Digestive problem">Digestive problem</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Recovery Status</label>
                    <select
                      value={medRecovery}
                      onChange={(e) => setMedRecovery(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Full Recovery">Full Recovery</option>
                      <option value="Improving">Improving</option>
                      <option value="Ongoing Treatment">Ongoing Treatment</option>
                      <option value="Guarded">Guarded</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Suspected Condition / Clinical Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={medCondition}
                    onChange={(e) => setMedCondition(e.target.value)}
                    placeholder="e.g. Superficial paw pad laceration"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Treatment Provided *</label>
                  <textarea
                    rows={2}
                    required
                    value={medTreatment}
                    onChange={(e) => setMedTreatment(e.target.value)}
                    placeholder="e.g. Wound debridement, Betadine dressing, analgesia"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="urgentCheck"
                    checked={medUrgent || medCategory === 'Suspected rabies exposure'}
                    onChange={(e) => setMedUrgent(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <label htmlFor="urgentCheck" className="text-xs font-bold text-rose-900 cursor-pointer">
                    Flag as Critical Rabies Concern (Places dog in mandatory quarantine)
                  </label>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddMedModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Log Examination
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Log Vitals & Observations */}
        {showAddObsModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Record Field Observation & Vitals</h3>

              <form onSubmit={handleCreateObservation} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Activity / Behavior</label>
                    <select
                      value={obsBehavior}
                      onChange={(e) => setObsBehavior(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                    >
                      <option value="Normal & Energetic">Normal & Energetic</option>
                      <option value="Lethargic">Lethargic</option>
                      <option value="Aggressive">Aggressive</option>
                      <option value="Shy / Hiding">Shy / Hiding</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Mobility</label>
                    <select
                      value={obsMobility}
                      onChange={(e) => setObsMobility(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Limping">Limping</option>
                      <option value="Reluctant to move">Reluctant to move</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Body Temp (°C measured)</label>
                    <input
                      type="text"
                      value={obsTemp}
                      onChange={(e) => setObsTemp(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Measured Weight (kg)</label>
                    <input
                      type="text"
                      value={obsWeight}
                      onChange={(e) => setObsWeight(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Field Notes</label>
                  <textarea
                    rows={2}
                    value={obsNotes}
                    onChange={(e) => setObsNotes(e.target.value)}
                    placeholder="General behavior, feeding appetite..."
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddObsModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Save Vitals Log
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Replace QR Tag */}
        {showReplaceTagModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Issue Replacement QR Tag</h3>
              <p className="text-xs text-charcoal-500">
                Replace tag for {dog.name} ({dog.dog_id}). The old tag ({dog.qr_tag_id}) will be marked as replaced/deactivated.
              </p>

              <form onSubmit={handleReplaceTag} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">New Tag ID *</label>
                  <input
                    type="text"
                    required
                    value={newTagCode}
                    onChange={(e) => setNewTagCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 font-mono text-sm font-bold text-teal-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Reason for Replacement *</label>
                  <select
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                  >
                    <option value="Collar tag scratched / worn out">Collar tag scratched / worn out</option>
                    <option value="Collar lost in territory">Collar lost in territory</option>
                    <option value="Strap snapped / damaged">Strap snapped / damaged</option>
                    <option value="Tag upgrade to heavy-duty plate">Tag upgrade to heavy-duty plate</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowReplaceTagModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Confirm & Issue New Tag
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: Edit Profile */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Edit Dog Profile</h3>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Dog Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Designated Territory / Usual Area</label>
                  <input
                    type="text"
                    value={editArea}
                    onChange={(e) => setEditArea(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Health Status</label>
                    <select
                      value={editHealth}
                      onChange={(e) => setEditHealth(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                    >
                      <option value="Healthy">Healthy</option>
                      <option value="Needs Treatment">Needs Treatment</option>
                      <option value="Under Observation">Under Observation</option>
                      <option value="Critical">Critical</option>
                      <option value="Quarantined">Quarantined</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Sterilization Status</label>
                    <select
                      value={editSterilization}
                      onChange={(e) => setEditSterilization(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                    >
                      <option value="Sterilized">Sterilized</option>
                      <option value="Intact">Intact</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
