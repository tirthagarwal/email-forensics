import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Dog, DogSighting } from '../lib/types'
import { StatusBadge } from './StatusBadge'
import { MapPin, Info, ExternalLink, Filter, Search } from 'lucide-react'

// Dynamically import Leaflet components to avoid Next.js SSR window errors
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
)
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
)

interface RescueMapProps {
  dogs: Dog[]
  sightings: DogSighting[]
  onSelectLocation?: (lat: number, lng: number, address: string) => void
  selectedDogId?: string
}

export const RescueMap: React.FC<RescueMapProps> = ({
  dogs,
  sightings,
  onSelectLocation,
  selectedDogId,
}) => {
  const [isClient, setIsClient] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [customIcon, setCustomIcon] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        // Fix Leaflet's default icon missing in React
        delete (L.Icon.Default.prototype as any)._getIconUrl
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        })
      })
    }
  }, [])

  // Filter dogs
  const filteredDogs = dogs.filter((dog) => {
    if (dog.status !== 'active') return false
    if (filterStatus === 'vaccinated' && dog.vaccination_status !== 'Vaccinated') return false
    if (filterStatus === 'overdue' && dog.vaccination_status !== 'Overdue') return false
    if (filterStatus === 'treatment' && dog.health_status !== 'Needs Treatment' && dog.health_status !== 'Critical') return false
    if (filterStatus === 'quarantine' && dog.health_status !== 'Quarantined') return false

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        dog.name.toLowerCase().includes(q) ||
        dog.dog_id.toLowerCase().includes(q) ||
        dog.usual_area.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Center coordinate
  const defaultCenter: [number, number] = [28.5355, 77.391]

  if (!isClient) {
    return (
      <div className="w-full h-96 rounded-2xl bg-warm-100 flex items-center justify-center text-charcoal-400 text-sm">
        Loading Map View...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Map Control Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-warm-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-charcoal-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dogs by name, ID or area..."
            className="w-full bg-transparent border-none text-charcoal-800 placeholder-charcoal-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-charcoal-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700 focus:outline-none focus:ring-1 focus:ring-forest-500"
          >
            <option value="all">All Registered Dogs ({dogs.length})</option>
            <option value="vaccinated">Vaccinated Only</option>
            <option value="overdue">Overdue Vaccination</option>
            <option value="treatment">Needs Medical Treatment</option>
            <option value="quarantine">Quarantine Cases</option>
          </select>
        </div>
      </div>

      {/* Map Frame */}
      <div className="w-full h-[520px] rounded-2xl overflow-hidden border border-warm-200 shadow-soft relative">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          scrollWheelZoom={false}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Markers for Dogs */}
          {filteredDogs.map((dog) => {
            const loc = dog.last_sighting_location
            if (!loc || !loc.lat || !loc.lng) return null

            return (
              <Marker key={dog.id} position={[loc.lat, loc.lng]}>
                <Popup>
                  <div className="p-1 max-w-[220px] text-charcoal-900 font-sans">
                    <div className="relative h-24 w-full rounded-lg overflow-hidden mb-2">
                      <img
                        src={dog.photo_url}
                        alt={dog.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-forest-950">{dog.name}</p>
                      <span className="font-mono text-[10px] bg-warm-100 px-1 py-0.5 rounded font-semibold">
                        {dog.dog_id}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs mb-2">
                      <div className="flex items-center gap-1">
                        <StatusBadge status={dog.vaccination_status} type="vaccination" size="sm" />
                      </div>
                      <p className="text-[11px] text-charcoal-500 line-clamp-1">
                        📍 {loc.address}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-warm-200 flex items-center justify-between">
                      <Link
                        href={`/dashboard/dogs/${dog.dog_id}`}
                        className="text-xs font-bold text-forest-800 hover:underline flex items-center gap-1"
                      >
                        <span>Full Profile</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <a
                        href={`/dog/${dog.dog_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-teal-700 hover:underline"
                      >
                        Public QR
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
        </MapContainer>

        {/* Informational overlay notice */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-md bg-white/95 backdrop-blur-xs p-3 rounded-xl border border-warm-200 shadow-soft text-xs text-charcoal-600 z-1000 flex items-start gap-2">
          <Info className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong className="text-charcoal-900">Recorded Sightings Map:</strong> Pins indicate the last recorded sightings and designated community territories logged by citizens and field teams. The QR collar does not transmit live continuous GPS.
          </p>
        </div>
      </div>
    </div>
  )
}
