import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  MessageSquareWarning,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  ExternalLink,
  Edit2,
  Check,
  MapPin,
  Phone,
  Shield
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { StatusBadge } from '../../components/StatusBadge'
import { CommunityReport } from '../../lib/types'

export default function ReportsManagementPage() {
  const { communityReports, updateReportStatus, dogs, currentUser } = useRescueAI()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [selectedReport, setSelectedReport] = useState<CommunityReport | null>(null)

  // Edit / Resolve Modal
  const [newStatus, setNewStatus] = useState<CommunityReport['status']>('In Progress')
  const [assignedWorker, setAssignedWorker] = useState('David Martinez')
  const [internalNotes, setInternalNotes] = useState('')

  const filteredReports = communityReports.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (typeFilter !== 'all' && r.report_type !== typeFilter) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        r.reference_number.toLowerCase().includes(q) ||
        r.report_type.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.location.address.toLowerCase().includes(q) ||
        (r.dog_id && r.dog_id.toLowerCase().includes(q))
      )
    }

    return true
  })

  const openActionModal = (report: CommunityReport) => {
    setSelectedReport(report)
    setNewStatus(report.status)
    setAssignedWorker(report.assigned_worker || 'David Martinez')
    setInternalNotes(report.internal_notes || '')
  }

  const handleSaveReportAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedReport) return

    updateReportStatus(selectedReport.id, newStatus, assignedWorker, internalNotes)
    setSelectedReport(null)
  }

  return (
    <DashboardLayout
      title="Community Citizen Reports"
      subtitle="Review, dispatch field teams, and resolve citizen submissions for injured, sick, or sighted dogs"
    >
      <Head>
        <title>Community Reports — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Total Reports</span>
            <p className="text-2xl font-black text-charcoal-900 font-mono mt-1">{communityReports.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">New / Unassigned</span>
            <p className="text-2xl font-black text-rose-700 font-mono mt-1">
              {communityReports.filter((r) => r.status === 'New').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">In Field Progress</span>
            <p className="text-2xl font-black text-amber-700 font-mono mt-1">
              {communityReports.filter((r) => r.status === 'In Progress' || r.status === 'Assigned').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Resolved Cases</span>
            <p className="text-2xl font-black text-emerald-800 font-mono mt-1">
              {communityReports.filter((r) => r.status === 'Resolved').length}
            </p>
          </div>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reports by reference # (e.g. REP-2026-0842), type, address, or dog ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-warm-200 text-xs sm:text-sm bg-warm-50/50 focus:outline-none focus:ring-2 focus:ring-forest-600"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-charcoal-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700"
            >
              <option value="all">All Report Statuses</option>
              <option value="New">New</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700"
            >
              <option value="all">All Report Types</option>
              <option value="Injured Dog">Injured Dog</option>
              <option value="Sick Dog">Sick Dog</option>
              <option value="Suspected Rabies Concern">Suspected Rabies</option>
              <option value="Dog Sighting">Dog Sighting</option>
              <option value="Damaged / Missing Collar">Collar Tag Issue</option>
            </select>
          </div>
        </div>

        {/* REPORTS LIST */}
        <div className="space-y-4">
          {filteredReports.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-warm-200 text-center text-xs text-charcoal-400">
              No community reports match the selected filters.
            </div>
          ) : (
            filteredReports.map((rep) => {
              const dog = rep.dog_id ? dogs.find((d) => d.dog_id === rep.dog_id) : null
              return (
                <div
                  key={rep.id}
                  className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs space-y-4 hover:border-forest-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center font-bold text-xs">
                        <MessageSquareWarning className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-sm text-charcoal-900">
                            {rep.reference_number}
                          </span>
                          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                            {rep.report_type}
                          </span>
                        </div>
                        <span className="text-[11px] text-charcoal-400">
                          Submitted on {new Date(rep.reported_at).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={rep.status} size="sm" />
                      <button
                        onClick={() => openActionModal(rep)}
                        className="px-3 py-1.5 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Update Status</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-charcoal-700 leading-relaxed font-medium">
                    {rep.description}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-warm-50 p-3.5 rounded-2xl">
                    <p className="flex items-center gap-1.5 text-charcoal-700">
                      <MapPin className="w-4 h-4 text-forest-700 flex-shrink-0" />
                      <span>{rep.location.address}</span>
                    </p>

                    {rep.dog_id ? (
                      <p className="flex items-center gap-1.5 text-charcoal-700">
                        <span>Associated Dog:</span>
                        <Link
                          href={`/dashboard/dogs/${rep.dog_id}`}
                          className="font-mono font-bold text-forest-900 underline flex items-center gap-0.5"
                        >
                          <span>{dog?.name || rep.dog_id}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </p>
                    ) : (
                      <p className="text-charcoal-400 italic">No specific collar ID tagged by citizen</p>
                    )}
                  </div>

                  {rep.internal_notes && (
                    <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-200 text-xs text-teal-950">
                      <strong>Internal Rescue Notes:</strong> {rep.internal_notes}
                    </div>
                  )}

                  <div className="pt-2 border-t border-warm-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-charcoal-500">
                    <span>Assigned Responder: <strong>{rep.assigned_worker || 'Unassigned'}</strong></span>
                    {rep.reporter_name && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-charcoal-400" />
                        <span>Citizen: {rep.reporter_name} ({rep.reporter_phone || 'Private'})</span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* MODAL: Update Report Status & Assign Worker */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">
                Manage Report: {selectedReport.reference_number}
              </h3>
              <p className="text-xs text-charcoal-500">{selectedReport.description}</p>

              <form onSubmit={handleSaveReportAction} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Workflow Status *</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    <option value="New">New</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Assign Field Worker</label>
                  <select
                    value={assignedWorker}
                    onChange={(e) => setAssignedWorker(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                  >
                    <option value="David Martinez">David Martinez (NGO Field Officer)</option>
                    <option value="Dr. Arun Patel, DVM">Dr. Arun Patel, DVM (Veterinarian)</option>
                    <option value="Officer Clara Vance">Officer Clara Vance (Municipal Cell)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Internal Operational Notes</label>
                  <textarea
                    rows={3}
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Document treatment administered, shelter arrival, or follow-up details..."
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                  <p className="text-[10px] text-charcoal-400">
                    Protected: Internal notes are strictly hidden from public QR viewers.
                  </p>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Save & Update Report
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
