import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Dog as DogIcon,
  Plus,
  Search,
  Filter,
  QrCode,
  MapPin,
  ExternalLink,
  Archive,
  Download,
  LayoutGrid,
  List,
  Check,
  AlertCircle
} from 'lucide-react'
import { DashboardLayout } from '../../../components/DashboardLayout'
import { useRescueAI } from '../../../lib/store'
import { StatusBadge } from '../../../components/StatusBadge'
import { PrintableCollarTag } from '../../../components/PrintableCollarTag'
import { Dog } from '../../../lib/types'

export default function DogRegistryPage() {
  const { dogs, archiveDog } = useRescueAI()

  const [searchQuery, setSearchQuery] = useState('')
  const [healthFilter, setHealthFilter] = useState('all')
  const [vaccineFilter, setVaccineFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [selectedTagDog, setSelectedTagDog] = useState<Dog | null>(null)

  // Get unique areas
  const areas = Array.from(new Set(dogs.map((d) => d.usual_area.split('&')[0].trim().split(',')[0].trim())))

  // Filter dogs
  const filteredDogs = dogs.filter((d) => {
    if (d.status !== 'active') return false

    if (healthFilter !== 'all' && d.health_status !== healthFilter) return false
    if (vaccineFilter !== 'all' && d.vaccination_status !== vaccineFilter) return false
    if (areaFilter !== 'all' && !d.usual_area.includes(areaFilter)) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        d.name.toLowerCase().includes(q) ||
        d.dog_id.toLowerCase().includes(q) ||
        d.qr_tag_id.toLowerCase().includes(q) ||
        (d.microchip_id && d.microchip_id.toLowerCase().includes(q)) ||
        d.color_markings.toLowerCase().includes(q) ||
        d.usual_area.toLowerCase().includes(q)
      )
    }

    return true
  })

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Dog ID', 'Name', 'Breed', 'Age', 'Sex', 'Vaccination Status', 'Health Status', 'Usual Area', 'QR Tag ID', 'Microchip ID', 'Registered Date']
    const rows = filteredDogs.map((d) => [
      d.dog_id,
      `"${d.name}"`,
      `"${d.breed}"`,
      `"${d.estimated_age}"`,
      d.sex,
      d.vaccination_status,
      d.health_status,
      `"${d.usual_area}"`,
      d.qr_tag_id,
      d.microchip_id || 'N/A',
      d.date_registered,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RescueAI_Dog_Registry_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleArchive = (dog: Dog) => {
    if (
      confirm(
        `Are you sure you want to archive ${dog.name} (${dog.dog_id})? This will deactivate collar tag ${dog.qr_tag_id} and move the profile to archived status.`
      )
    ) {
      archiveDog(dog.id)
    }
  }

  return (
    <DashboardLayout
      title="Dog Registry & Digital Profiles"
      subtitle={`Displaying ${filteredDogs.length} of ${dogs.length} total registered canine records`}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl shadow-2xs"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-charcoal-500" />
            <span>Export CSV</span>
          </button>
          <Link
            href="/dashboard/dogs/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft"
          >
            <Plus className="w-4 h-4" />
            <span>Register Dog</span>
          </Link>
        </div>
      }
    >
      <Head>
        <title>Dog Registry — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* SEARCH & FILTERS BAR */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by dog name, ID (e.g. RAI-DOG-0001), collar tag, microchip, or color..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-warm-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest-600 bg-warm-50/50"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 p-1 bg-warm-100 rounded-xl self-end sm:self-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-forest-900 shadow-2xs' : 'text-charcoal-500'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table' ? 'bg-white text-forest-900 shadow-2xs' : 'text-charcoal-500'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-warm-100 text-xs">
            <span className="text-charcoal-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>

            <select
              value={vaccineFilter}
              onChange={(e) => setVaccineFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none"
            >
              <option value="all">All Vaccination Statuses</option>
              <option value="Vaccinated">Vaccinated</option>
              <option value="Due Soon">Due Soon</option>
              <option value="Overdue">Overdue</option>
              <option value="Unvaccinated">Unvaccinated</option>
            </select>

            <select
              value={healthFilter}
              onChange={(e) => setHealthFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none"
            >
              <option value="all">All Health Conditions</option>
              <option value="Healthy">Healthy</option>
              <option value="Needs Treatment">Needs Treatment</option>
              <option value="Critical">Critical</option>
              <option value="Quarantined">Quarantined</option>
              <option value="Under Observation">Under Observation</option>
            </select>

            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none max-w-[160px] truncate"
            >
              <option value="all">All Territories / Sectors</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {(searchQuery || healthFilter !== 'all' || vaccineFilter !== 'all' || areaFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setHealthFilter('all')
                  setVaccineFilter('all')
                  setAreaFilter('all')
                }}
                className="text-xs text-teal-700 font-semibold hover:underline ml-auto"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* MODAL: Printable Collar Tag View */}
        {selectedTagDog && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="w-full max-w-xl">
              <PrintableCollarTag dog={selectedTagDog} onClose={() => setSelectedTagDog(null)} />
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {filteredDogs.length === 0 && (
          <div className="bg-white rounded-3xl border border-warm-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-warm-100 text-charcoal-400 flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-charcoal-800 text-base">No dogs match your filter criteria</h3>
            <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
              Try adjusting your search terms or clearing status filters to view registered dogs.
            </p>
          </div>
        )}

        {/* VIEW 1: GRID VIEW */}
        {viewMode === 'grid' && filteredDogs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDogs.map((dog) => (
              <div
                key={dog.id}
                className="bg-white rounded-3xl border border-warm-200 overflow-hidden shadow-2xs hover:shadow-soft hover:border-forest-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Image */}
                  <div className="relative h-48 w-full bg-charcoal-900">
                    <img
                      src={dog.photo_url}
                      alt={dog.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <StatusBadge status={dog.vaccination_status} type="vaccination" size="sm" />
                      <StatusBadge status={dog.health_status} type="health" size="sm" />
                    </div>
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold text-charcoal-900 shadow-2xs">
                      {dog.dog_id}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-lg text-charcoal-900">{dog.name}</h3>
                        <span className="text-xs text-charcoal-500">{dog.sex}</span>
                      </div>
                      <p className="text-xs text-charcoal-500 mt-0.5">{dog.breed} • {dog.estimated_age}</p>
                    </div>

                    <p className="text-xs text-charcoal-600 line-clamp-2 leading-relaxed">
                      {dog.color_markings}
                    </p>

                    <div className="pt-2 border-t border-warm-100 text-xs space-y-1">
                      <p className="flex items-center gap-1.5 text-charcoal-600 truncate">
                        <MapPin className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
                        <span className="truncate">{dog.usual_area}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-charcoal-500 text-[11px]">
                        <QrCode className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                        <span className="font-mono">Tag: {dog.qr_tag_id}</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3.5 bg-warm-50 border-t border-warm-200 flex items-center justify-between text-xs">
                  <button
                    onClick={() => setSelectedTagDog(dog)}
                    className="font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Collar Tag</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleArchive(dog)}
                      className="p-1.5 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50"
                      title="Archive dog record"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <Link
                      href={`/dashboard/dogs/${dog.dog_id}`}
                      className="px-3 py-1.5 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-2xs"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VIEW 2: TABLE VIEW */}
        {viewMode === 'table' && filteredDogs.length > 0 && (
          <div className="bg-white rounded-3xl border border-warm-200 shadow-soft overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-warm-100 text-charcoal-600 uppercase font-bold text-[10px] tracking-wider border-b border-warm-200">
                  <tr>
                    <th className="py-3 px-4">Dog</th>
                    <th className="py-3 px-4">Identifier</th>
                    <th className="py-3 px-4">Vaccination</th>
                    <th className="py-3 px-4">Health Status</th>
                    <th className="py-3 px-4">Territory Area</th>
                    <th className="py-3 px-4">QR Collar Tag</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-warm-100">
                  {filteredDogs.map((dog) => (
                    <tr key={dog.id} className="hover:bg-warm-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={dog.photo_url}
                            alt={dog.name}
                            className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                          />
                          <div>
                            <p className="font-bold text-charcoal-900">{dog.name}</p>
                            <p className="text-[10px] text-charcoal-400">{dog.breed} • {dog.sex}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-charcoal-800">
                        {dog.dog_id}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={dog.vaccination_status} type="vaccination" size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={dog.health_status} type="health" size="sm" />
                      </td>
                      <td className="py-3 px-4 text-charcoal-600 max-w-[180px] truncate">
                        {dog.usual_area}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-teal-800">
                        {dog.qr_tag_id}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedTagDog(dog)}
                          className="p-1.5 text-teal-700 hover:bg-teal-50 rounded-lg"
                          title="Print Collar Tag"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(dog)}
                          className="p-1.5 text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/dashboard/dogs/${dog.dog_id}`}
                          className="inline-block px-2.5 py-1 bg-forest-800 text-white font-semibold rounded-lg text-xs"
                        >
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
