import React, { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Syringe,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Download,
  AlertCircle,
  ExternalLink
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { StatusBadge } from '../../components/StatusBadge'
import { VaccinationRecord } from '../../lib/types'

export default function VaccinationsPage() {
  const router = useRouter()
  const { status: queryStatus } = router.query
  const { vaccinations, dogs, addVaccinationRecord, currentUser } = useRescueAI()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vaccineTypeFilter, setVaccineTypeFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form State
  const [selectedDogId, setSelectedDogId] = useState(dogs[0]?.dog_id || 'RAI-DOG-0001')
  const [vacName, setVacName] = useState('Nobivac Rabies (Inactivated)')
  const [disease, setDisease] = useState('Rabies Virus')
  const [adminDate, setAdminDate] = useState(new Date().toISOString().split('T')[0])
  const [nextDueDate, setNextDueDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [doseInfo, setDoseInfo] = useState('1.0 ml Subcutaneous')
  const [batchNo, setBatchNo] = useState('NR-9901')
  const [notes, setNotes] = useState('')
  const [potentialDuplicateWarning, setPotentialDuplicateWarning] = useState<string | null>(null)

  useEffect(() => {
    if (queryStatus && typeof queryStatus === 'string') {
      setStatusFilter(queryStatus)
    }
  }, [queryStatus])

  // Check for duplicate on dog / vaccine selection
  useEffect(() => {
    const existing = vaccinations.find(
      (v) =>
        v.dog_id === selectedDogId &&
        (v.vaccine_name.toLowerCase().includes(vacName.toLowerCase()) ||
          vacName.toLowerCase().includes(v.vaccine_name.toLowerCase()))
    )

    if (existing) {
      setPotentialDuplicateWarning(
        `Notice: ${selectedDogId} was already administered "${existing.vaccine_name}" on ${new Date(
          existing.date_administered
        ).toLocaleDateString()}. Submitting this record will be flagged for duplicate review.`
      )
    } else {
      setPotentialDuplicateWarning(null)
    }
  }, [selectedDogId, vacName, vaccinations])

  const filteredVaccinations = vaccinations.filter((v) => {
    const dog = dogs.find((d) => d.dog_id === v.dog_id)

    if (statusFilter !== 'all') {
      if (statusFilter === 'Overdue' && v.status !== 'Overdue') return false
      if (statusFilter === 'Vaccinated' && v.status !== 'Valid') return false
      if (statusFilter === 'Due Soon' && v.status !== 'Valid') return false
    }

    if (vaccineTypeFilter !== 'all') {
      if (!v.vaccine_name.toLowerCase().includes(vaccineTypeFilter.toLowerCase())) return false
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        v.dog_id.toLowerCase().includes(q) ||
        v.vaccine_name.toLowerCase().includes(q) ||
        v.disease_targeted.toLowerCase().includes(q) ||
        (dog && dog.name.toLowerCase().includes(q)) ||
        (v.batch_number && v.batch_number.toLowerCase().includes(q))
      )
    }

    return true
  })

  const handleSubmitVaccine = (e: React.FormEvent) => {
    e.preventDefault()

    const { isDuplicateWarning } = addVaccinationRecord({
      dog_id: selectedDogId,
      vaccine_name: vacName,
      disease_targeted: disease,
      date_administered: adminDate,
      next_due_date: nextDueDate || undefined,
      dose_info: doseInfo,
      veterinarian_name: currentUser?.full_name || 'Dr. Arun Patel, DVM',
      veterinary_org: currentUser?.organisation_name || 'Metro City Veterinary Clinic',
      batch_number: batchNo,
      notes,
      status: 'Valid',
    })

    setShowAddModal(false)
    if (isDuplicateWarning) {
      alert(`Safety Alert: Duplicate record registered for ${selectedDogId}. Saved with verification flag.`)
    }
  }

  const handleExportCSV = () => {
    const headers = ['Record ID', 'Dog ID', 'Vaccine', 'Disease', 'Admin Date', 'Next Due Date', 'Veterinarian', 'Batch', 'Status']
    const rows = filteredVaccinations.map((v) => [
      v.id,
      v.dog_id,
      `"${v.vaccine_name}"`,
      `"${v.disease_targeted}"`,
      v.date_administered,
      v.next_due_date || 'N/A',
      `"${v.veterinarian_name}"`,
      v.batch_number || 'N/A',
      v.status,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RescueAI_Vaccinations_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout
      title="Vaccination Management & Immunization Logs"
      subtitle="Track Rabies & Core Canine doses with duplicate prevention engine"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl"
          >
            <Download className="w-3.5 h-3.5 text-charcoal-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft"
          >
            <Plus className="w-4 h-4" />
            <span>Record Vaccination</span>
          </button>
        </div>
      }
    >
      <Head>
        <title>Vaccinations — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* FILTERS & SEARCH BAR */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vaccinations by dog ID, dog name, vaccine name, or batch number..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-warm-200 text-xs sm:text-sm bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-forest-600"
              />
            </div>

            <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
              <Filter className="w-3.5 h-3.5 text-charcoal-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none"
              >
                <option value="all">All Record Statuses</option>
                <option value="Vaccinated">Valid Doses</option>
                <option value="Due Soon">Due Soon</option>
                <option value="Overdue">Overdue</option>
              </select>

              <select
                value={vaccineTypeFilter}
                onChange={(e) => setVaccineTypeFilter(e.target.value)}
                className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none"
              >
                <option value="all">All Vaccine Types</option>
                <option value="Rabies">Rabies Vaccines</option>
                <option value="DHPP">DHPP (7-in-1)</option>
                <option value="Deworming">Deworming</option>
                <option value="Tick">Anti-Tick</option>
              </select>
            </div>
          </div>
        </div>

        {/* VACCINATION RECORDS TABLE */}
        <div className="bg-white rounded-3xl border border-warm-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-100 text-charcoal-600 uppercase font-bold text-[10px] tracking-wider border-b border-warm-200">
                <tr>
                  <th className="py-3.5 px-4">Dog</th>
                  <th className="py-3.5 px-4">Vaccine Formulation</th>
                  <th className="py-3.5 px-4">Date Given</th>
                  <th className="py-3.5 px-4">Booster Deadline</th>
                  <th className="py-3.5 px-4">Batch #</th>
                  <th className="py-3.5 px-4">Veterinarian & Clinic</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {filteredVaccinations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-400">
                      No vaccination records matching the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVaccinations.map((vac) => {
                    const dog = dogs.find((d) => d.dog_id === vac.dog_id)
                    return (
                      <tr key={vac.id} className="hover:bg-warm-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/dashboard/dogs/${vac.dog_id}`}
                            className="flex items-center gap-2.5 group"
                          >
                            <img
                              src={dog?.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100&auto=format&fit=crop&q=80'}
                              alt={dog?.name || vac.dog_id}
                              className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
                            />
                            <div>
                              <p className="font-bold text-charcoal-900 group-hover:text-forest-900">
                                {dog?.name || 'Stray Dog'}
                              </p>
                              <span className="font-mono text-[10px] text-charcoal-500">
                                {vac.dog_id}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-charcoal-900">{vac.vaccine_name}</p>
                          <p className="text-[11px] text-charcoal-500">{vac.disease_targeted}</p>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-charcoal-700">
                          {new Date(vac.date_administered).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-forest-900">
                          {vac.next_due_date ? new Date(vac.next_due_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-charcoal-600">
                          {vac.batch_number || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-charcoal-800">{vac.veterinarian_name}</p>
                          <p className="text-[10px] text-charcoal-400">{vac.veterinary_org}</p>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              vac.status === 'Duplicate_Flagged'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}
                          >
                            {vac.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: Record Vaccination with Duplicate Detection */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-forest-800" />
                <h3 className="font-bold text-lg text-charcoal-900">Record Canine Vaccination</h3>
              </div>

              {potentialDuplicateWarning && (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{potentialDuplicateWarning}</p>
                </div>
              )}

              <form onSubmit={handleSubmitVaccine} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Select Dog *</label>
                  <select
                    value={selectedDogId}
                    onChange={(e) => setSelectedDogId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    {dogs.map((d) => (
                      <option key={d.id} value={d.dog_id}>
                        {d.name} ({d.dog_id}) — {d.vaccination_status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Vaccine Formulation *</label>
                  <select
                    value={vacName}
                    onChange={(e) => {
                      setVacName(e.target.value)
                      if (e.target.value.includes('Rabies')) setDisease('Rabies Virus')
                      else if (e.target.value.includes('DHPP')) setDisease('Core 7-in-1 Canine Spectrum')
                      else setDisease('Parasitic / Core')
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    <option value="Nobivac Rabies (Inactivated)">Nobivac Rabies (Inactivated)</option>
                    <option value="Defensor 3 Rabies Vaccine">Defensor 3 Rabies Vaccine</option>
                    <option value="Canigen DHPPi/L (7-in-1)">Canigen DHPPi/L (7-in-1)</option>
                    <option value="Drontal Plus Deworming">Drontal Plus Deworming</option>
                    <option value="Bravecto Anti-Tick & Flea">Bravecto Anti-Tick & Flea Oral Dose</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Administered Date *</label>
                    <input
                      type="date"
                      required
                      value={adminDate}
                      onChange={(e) => setAdminDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Next Booster Date</label>
                    <input
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Dose Quantity</label>
                    <input
                      type="text"
                      value={doseInfo}
                      onChange={(e) => setDoseInfo(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Batch Number</label>
                    <input
                      type="text"
                      value={batchNo}
                      onChange={(e) => setBatchNo(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>
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
                    Save & Update Immunity Status
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
