import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Tag,
  QrCode,
  Search,
  Filter,
  Plus,
  Printer,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Shield,
  XCircle
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { StatusBadge } from '../../components/StatusBadge'
import { PrintableCollarTag } from '../../components/PrintableCollarTag'
import { QRDevice } from '../../lib/types'

export default function DeviceManagementPage() {
  const { devices, dogs, replaceQRTag } = useRescueAI()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [selectedTagDog, setSelectedTagDog] = useState<any>(null)
  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [targetDevice, setTargetDevice] = useState<QRDevice | null>(null)
  const [newTagId, setNewTagId] = useState('')
  const [replaceReason, setReplaceReason] = useState('Collar worn out / scratched')

  const filteredDevices = devices.filter((dev) => {
    if (statusFilter !== 'all' && dev.qr_status !== statusFilter) return false
    if (conditionFilter !== 'all' && dev.device_condition !== conditionFilter) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        dev.tag_id.toLowerCase().includes(q) ||
        dev.dog_id.toLowerCase().includes(q) ||
        dev.dog_name.toLowerCase().includes(q) ||
        (dev.notes && dev.notes.toLowerCase().includes(q))
      )
    }

    return true
  })

  const openReplaceModal = (dev: QRDevice) => {
    setTargetDevice(dev)
    setNewTagId(`TAG-RAI-${Math.floor(1000 + Math.random() * 9000)}-R`)
    setShowReplaceModal(true)
  }

  const handleConfirmReplace = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetDevice) return

    replaceQRTag(targetDevice.dog_id, newTagId.trim(), replaceReason)
    setShowReplaceModal(false)
    alert(`Replacement tag ${newTagId} issued. Former tag ${targetDevice.tag_id} has been deactivated.`)
  }

  const openPrintModal = (dev: QRDevice) => {
    const dog = dogs.find((d) => d.dog_id === dev.dog_id)
    if (dog) {
      setSelectedTagDog(dog)
    } else {
      alert(`Could not find dog record for ${dev.dog_id}`)
    }
  }

  return (
    <DashboardLayout
      title="Collar Tags & Hardware Management"
      subtitle="Lifecycle, replacement history, and status for physical QR collar medallions"
    >
      <Head>
        <title>Device Management — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Total Issued Tags</span>
            <p className="text-2xl font-black text-charcoal-900 mt-1 font-mono">{devices.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Active Weatherproof Tags</span>
            <p className="text-2xl font-black text-forest-900 mt-1 font-mono">
              {devices.filter((d) => d.qr_status === 'Active').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Damaged / Worn Tags</span>
            <p className="text-2xl font-black text-amber-800 mt-1 font-mono">
              {devices.filter((d) => d.qr_status === 'Damaged' || d.device_condition === 'Damaged').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Deactivated / Replaced</span>
            <p className="text-2xl font-black text-charcoal-600 mt-1 font-mono">
              {devices.filter((d) => d.qr_status === 'Replaced' || d.qr_status === 'Deactivated').length}
            </p>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collar tags by Tag ID, Dog ID, or Dog name..."
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
              <option value="all">All Tag Statuses</option>
              <option value="Active">Active</option>
              <option value="Damaged">Damaged</option>
              <option value="Replaced">Replaced</option>
              <option value="Deactivated">Deactivated</option>
            </select>

            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700"
            >
              <option value="all">All Hardware Conditions</option>
              <option value="Good">Good</option>
              <option value="Worn">Worn</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>
        </div>

        {/* DEVICE MANAGEMENT TABLE */}
        <div className="bg-white rounded-3xl border border-warm-200 shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-100 text-charcoal-600 uppercase font-bold text-[10px] tracking-wider border-b border-warm-200">
                <tr>
                  <th className="py-3.5 px-4">Tag Identifier</th>
                  <th className="py-3.5 px-4">Assigned Dog</th>
                  <th className="py-3.5 px-4">QR Status</th>
                  <th className="py-3.5 px-4">Issue Date</th>
                  <th className="py-3.5 px-4">Condition</th>
                  <th className="py-3.5 px-4">Scans Logged</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-charcoal-400">
                      No collar devices match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((dev) => (
                    <tr key={dev.id} className="hover:bg-warm-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <QrCode className="w-4 h-4 text-teal-700 flex-shrink-0" />
                          <span className="font-mono font-bold text-charcoal-900">{dev.tag_id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Link
                          href={`/dashboard/dogs/${dev.dog_id}`}
                          className="font-bold text-charcoal-900 hover:text-forest-800"
                        >
                          {dev.dog_name}{' '}
                          <span className="font-mono text-[10px] text-charcoal-400 font-normal">
                            ({dev.dog_id})
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={dev.qr_status} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-charcoal-600">
                        {new Date(dev.issue_date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-charcoal-700">
                        {dev.device_condition}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-forest-900">
                        {dev.scan_count}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button
                          onClick={() => openPrintModal(dev)}
                          className="p-1.5 text-forest-800 hover:bg-forest-50 rounded-lg"
                          title="Print Printable Collar Tag Layout"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        {dev.qr_status === 'Active' && (
                          <button
                            onClick={() => openReplaceModal(dev)}
                            className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-lg"
                            title="Replace Damaged Tag"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/dashboard/dogs/${dev.dog_id}`}
                          className="inline-block px-2.5 py-1 bg-warm-100 hover:bg-warm-200 text-charcoal-800 font-semibold rounded-lg text-xs"
                        >
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: Printable Tag */}
        {selectedTagDog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl">
              <PrintableCollarTag dog={selectedTagDog} onClose={() => setSelectedTagDog(null)} />
            </div>
          </div>
        )}

        {/* MODAL: Issue Replacement Tag */}
        {showReplaceModal && targetDevice && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Issue Replacement QR Tag</h3>
              <p className="text-xs text-charcoal-500">
                Replace tag for dog <strong>{targetDevice.dog_name}</strong> ({targetDevice.dog_id}). Previous tag ({targetDevice.tag_id}) will be deactivated immediately to prevent duplicate resolution.
              </p>

              <form onSubmit={handleConfirmReplace} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">New Tag ID *</label>
                  <input
                    type="text"
                    required
                    value={newTagId}
                    onChange={(e) => setNewTagId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 font-mono text-sm font-bold text-teal-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Replacement Reason *</label>
                  <select
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    <option value="Collar tag scratched / worn out">Collar tag scratched / worn out</option>
                    <option value="Collar lost in territory">Collar lost in territory</option>
                    <option value="Collar strap snapped">Collar strap snapped</option>
                    <option value="Hardware upgraded to stainless plate">Hardware upgraded to stainless plate</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowReplaceModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Issue Replacement Tag
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
