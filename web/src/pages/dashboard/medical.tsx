import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Heart,
  CheckCircle2,
  Calendar,
  FileText,
  Phone,
  ShieldAlert,
  Clock,
  ExternalLink
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { MedicalRecord } from '../../lib/types'

export default function MedicalHistoryPage() {
  const { medicalRecords, dogs, addMedicalRecord, currentUser } = useRescueAI()

  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [recoveryFilter, setRecoveryFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Add Examination Form State
  const [selectedDogId, setSelectedDogId] = useState(dogs[0]?.dog_id || 'RAI-DOG-0001')
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<MedicalRecord['category']>('Injury')
  const [symptoms, setSymptoms] = useState('')
  const [injuries, setInjuries] = useState('')
  const [suspectedCondition, setSuspectedCondition] = useState('')
  const [confirmedDiagnosis, setConfirmedDiagnosis] = useState('')
  const [treatment, setTreatment] = useState('')
  const [medication, setMedication] = useState('')
  const [recoveryStatus, setRecoveryStatus] = useState<MedicalRecord['recovery_status']>('Ongoing Treatment')
  const [followUpDate, setFollowUpDate] = useState('')
  const [urgentEscalation, setUrgentEscalation] = useState(false)

  const filteredRecords = medicalRecords.filter((m) => {
    const dog = dogs.find((d) => d.dog_id === m.dog_id)

    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false
    if (recoveryFilter !== 'all' && m.recovery_status !== recoveryFilter) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        m.dog_id.toLowerCase().includes(q) ||
        (dog && dog.name.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q) ||
        m.suspected_condition.toLowerCase().includes(q) ||
        (m.confirmed_diagnosis && m.confirmed_diagnosis.toLowerCase().includes(q)) ||
        m.treatment_provided.toLowerCase().includes(q)
      )
    }

    return true
  })

  // Count active rabies escalations
  const rabiesCases = medicalRecords.filter(
    (m) => m.category === 'Suspected rabies exposure' || m.urgent_escalation
  )

  const handleSubmitExam = (e: React.FormEvent) => {
    e.preventDefault()

    addMedicalRecord({
      dog_id: selectedDogId,
      examination_date: examDate,
      category,
      symptoms: symptoms ? symptoms.split(',').map((s) => s.trim()) : ['Observed in clinic'],
      observed_injuries: injuries.trim() || undefined,
      suspected_condition: suspectedCondition.trim(),
      confirmed_diagnosis: confirmedDiagnosis.trim() || undefined,
      treatment_provided: treatment.trim(),
      medication_details: medication.trim() || undefined,
      veterinarian_name: currentUser?.full_name || 'Dr. Arun Patel, DVM',
      treating_org: currentUser?.organisation_name || 'Metro City Veterinary Clinic',
      follow_up_date: followUpDate || undefined,
      recovery_status: recoveryStatus,
      urgent_escalation: urgentEscalation || category === 'Suspected rabies exposure',
    })

    setShowAddModal(false)
  }

  return (
    <DashboardLayout
      title="Veterinary Medical Records & Care History"
      subtitle="Clinical examinations, treatments, injuries, and rabies quarantine oversight"
      actions={
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft"
        >
          <Plus className="w-4 h-4" />
          <span>New Medical Exam</span>
        </button>
      }
    >
      <Head>
        <title>Medical Records — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* CRITICAL ESCALATION BANNER IF SUSPECTED RABIES ACTIVE */}
        {rabiesCases.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-rose-50 border-2 border-rose-300 shadow-soft text-xs text-rose-950 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 animate-pulse" />
                <h3 className="font-black text-sm uppercase tracking-wide text-rose-900">
                  Critical Escalation: {rabiesCases.length} Suspected Rabies / Quarantine Record(s) Active
                </h3>
              </div>
              <span className="font-bold text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full uppercase">
                Protocol Stage 1 Active
              </span>
            </div>

            <p className="leading-relaxed text-rose-900 max-w-4xl">
              Under public health safety regulations, any canine with suspected rabies exposure must remain under strict 10-day physical isolation in an authorized municipal quarantine enclosure. Direct contact without full PPE is prohibited. Contact the Municipal Rabies Control Cell at <strong>+1 (800) 555-PAWS</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {rabiesCases.map((rc) => (
                <Link
                  key={rc.id}
                  href={`/dashboard/dogs/${rc.dog_id}`}
                  className="px-2.5 py-1 bg-white text-rose-900 font-bold rounded-lg border border-rose-300 hover:bg-rose-100 flex items-center gap-1"
                >
                  <span>Dog {rc.dog_id}</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SEARCH & FILTERS */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medical records by dog ID, condition, treatment, or diagnosis..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-warm-200 text-xs sm:text-sm bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-forest-600"
              />
            </div>

            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-charcoal-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none"
              >
                <option value="all">All Clinical Categories</option>
                <option value="Injury">Injuries</option>
                <option value="Infection">Infections</option>
                <option value="Skin condition">Skin Conditions</option>
                <option value="Suspected rabies exposure">Suspected Rabies</option>
                <option value="Routine examination">Routine Examinations</option>
              </select>

              <select
                value={recoveryFilter}
                onChange={(e) => setRecoveryFilter(e.target.value)}
                className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none"
              >
                <option value="all">All Recovery Statuses</option>
                <option value="Full Recovery">Full Recovery</option>
                <option value="Improving">Improving</option>
                <option value="Ongoing Treatment">Ongoing Treatment</option>
                <option value="Guarded">Guarded</option>
              </select>
            </div>
          </div>
        </div>

        {/* CLINICAL RECORDS LIST */}
        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-warm-200 text-center text-xs text-charcoal-400">
              No clinical medical records match the active search and filter settings.
            </div>
          ) : (
            filteredRecords.map((med) => {
              const dog = dogs.find((d) => d.dog_id === med.dog_id)
              return (
                <div
                  key={med.id}
                  className={`bg-white rounded-3xl p-6 border shadow-2xs space-y-4 transition-all hover:border-forest-300 ${
                    med.urgent_escalation ? 'border-rose-400 bg-rose-50/20' : 'border-warm-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-100 pb-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/dogs/${med.dog_id}`}
                        className="flex items-center gap-2 group"
                      >
                        <img
                          src={dog?.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100&auto=format&fit=crop&q=80'}
                          alt={dog?.name || med.dog_id}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-charcoal-900 group-hover:text-forest-900 text-sm">
                            {dog?.name || 'Stray Dog'}
                          </p>
                          <span className="font-mono text-[10px] text-charcoal-500">
                            {med.dog_id}
                          </span>
                        </div>
                      </Link>

                      <div className="pl-3 border-l border-warm-200">
                        <span className="text-xs font-bold text-forest-950 block">
                          {med.category}
                        </span>
                        <span className="text-[10px] text-charcoal-400">
                          Exam Date: {new Date(med.examination_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          med.recovery_status === 'Full Recovery'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : med.recovery_status === 'Critical' || med.recovery_status === 'Guarded'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-blue-100 text-blue-900 border border-blue-300'
                        }`}
                      >
                        {med.recovery_status}
                      </span>
                    </div>
                  </div>

                  {/* Conditions & Treatment Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-charcoal-400 block mb-0.5">
                        Suspected Condition
                      </span>
                      <p className="font-semibold text-charcoal-800">{med.suspected_condition}</p>
                      {med.confirmed_diagnosis && (
                        <p className="text-[11px] text-teal-800 mt-1 font-medium">
                          <strong>Confirmed:</strong> {med.confirmed_diagnosis}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-charcoal-400 block mb-0.5">
                        Treatment & Clinical Interventions
                      </span>
                      <p className="text-charcoal-700 leading-relaxed">{med.treatment_provided}</p>
                    </div>
                  </div>

                  {med.observed_injuries && (
                    <div className="p-3 bg-warm-50 rounded-xl text-xs text-charcoal-700">
                      <strong>Observed Physical Trauma:</strong> {med.observed_injuries}
                    </div>
                  )}

                  {med.medication_details && (
                    <div className="p-3 bg-teal-50/50 rounded-xl text-xs text-teal-950 border border-teal-200">
                      <strong>Prescribed Medication & Dosage:</strong> {med.medication_details}
                    </div>
                  )}

                  <div className="pt-2 border-t border-warm-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-charcoal-500">
                    <span>Treating Veterinarian: <strong>{med.veterinarian_name}</strong> ({med.treating_org})</span>
                    {med.follow_up_date && (
                      <span className="font-bold text-forest-800 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Follow-up Scheduled: {new Date(med.follow_up_date).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* MODAL: Add New Clinical Examination */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-forest-800" />
                <h3 className="font-bold text-lg text-charcoal-900">Add Clinical Medical Examination</h3>
              </div>

              <form onSubmit={handleSubmitExam} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Select Dog *</label>
                  <select
                    value={selectedDogId}
                    onChange={(e) => setSelectedDogId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    {dogs.map((d) => (
                      <option key={d.id} value={d.dog_id}>
                        {d.name} ({d.dog_id}) — {d.health_status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Injury">Injury</option>
                      <option value="Infection">Infection</option>
                      <option value="Skin condition">Skin condition</option>
                      <option value="Suspected rabies exposure">Suspected rabies exposure</option>
                      <option value="Digestive problem">Digestive problem</option>
                      <option value="Respiratory symptoms">Respiratory symptoms</option>
                      <option value="Routine examination">Routine examination</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Exam Date *</label>
                    <input
                      type="date"
                      required
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Suspected Condition *</label>
                  <input
                    type="text"
                    required
                    value={suspectedCondition}
                    onChange={(e) => setSuspectedCondition(e.target.value)}
                    placeholder="e.g. Right forelimb lameness / carpal sprain"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Confirmed Diagnosis (If verified)</label>
                  <input
                    type="text"
                    value={confirmedDiagnosis}
                    onChange={(e) => setConfirmedDiagnosis(e.target.value)}
                    placeholder="e.g. Acute soft tissue carpal strain"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Treatment Provided *</label>
                  <textarea
                    rows={2}
                    required
                    value={treatment}
                    onChange={(e) => setTreatment(e.target.value)}
                    placeholder="e.g. Cold compress applied, Robert Jones support bandage"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Medication Details</label>
                  <input
                    type="text"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    placeholder="e.g. Meloxicam 0.1mg/kg PO SID x 5 days"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Recovery Status</label>
                    <select
                      value={recoveryStatus}
                      onChange={(e) => setRecoveryStatus(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="Ongoing Treatment">Ongoing Treatment</option>
                      <option value="Improving">Improving</option>
                      <option value="Full Recovery">Full Recovery</option>
                      <option value="Guarded">Guarded</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Follow-up Date</label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="urgentCheck2"
                    checked={urgentEscalation || category === 'Suspected rabies exposure'}
                    onChange={(e) => setUrgentEscalation(e.target.checked)}
                    className="w-4 h-4 text-rose-600 rounded"
                  />
                  <label htmlFor="urgentCheck2" className="text-xs font-bold text-rose-900 cursor-pointer">
                    Flag for Emergency Rabies Quarantine Protocol
                  </label>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Save Clinical Record
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
