import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Info,
  ExternalLink,
  Crosshair,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { RescueMap } from '../../components/RescueMap'
import { useRescueAI } from '../../lib/store'

export default function MapPage() {
  const { dogs, sightings, submitSighting, currentUser } = useRescueAI()

  const [showSightingModal, setShowSightingModal] = useState(false)
  const [selectedDogId, setSelectedDogId] = useState(dogs[0]?.dog_id || 'RAI-DOG-0001')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState('28.5355')
  const [lng, setLng] = useState('77.3910')
  const [observation, setObservation] = useState('Active and healthy in territory')
  const [locating, setLocating] = useState(false)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not available.')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4))
        setLng(pos.coords.longitude.toFixed(4))
        setAddress(`GPS Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`)
        setLocating(false)
      },
      () => {
        setLocating(false)
        alert('Could not fetch GPS coordinates. Please enter manually.')
      }
    )
  }

  const handleSubmitSighting = (e: React.FormEvent) => {
    e.preventDefault()

    const dog = dogs.find((d) => d.dog_id === selectedDogId)

    submitSighting({
      dog_id: selectedDogId,
      dog_name: dog?.name,
      location: {
        lat: parseFloat(lat) || 28.5355,
        lng: parseFloat(lng) || 77.3910,
        address: address.trim() || 'Central District Market',
      },
      health_observation: observation.trim(),
      reporter_type: 'Field Worker',
      reporter_name: currentUser?.full_name || 'David Martinez',
      verified: true,
    })

    setShowSightingModal(false)
    alert(`Sighting recorded for ${selectedDogId}. Map location updated!`)
  }

  return (
    <DashboardLayout
      title="Canine Territory Mapping & Recorded Sightings"
      subtitle="Interactive geospatial view of registered dogs, sightings, and vaccination campaigns"
      actions={
        <button
          onClick={() => setShowSightingModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft"
        >
          <Plus className="w-4 h-4" />
          <span>Log Field Sighting</span>
        </button>
      }
    >
      <Head>
        <title>Canine Territory Map — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* INTERACTIVE LEAFLET OPENSTREETMAP */}
        <RescueMap dogs={dogs} sightings={sightings} />

        {/* RECENT SIGHTINGS FEED */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-warm-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-charcoal-900 uppercase tracking-wide">
                Recent Sighting Records ({sightings.length})
              </h3>
              <p className="text-xs text-charcoal-500">
                Verified community sightings helping maintain accurate territory maps
              </p>
            </div>
            <button
              onClick={() => setShowSightingModal(true)}
              className="text-xs font-bold text-forest-800 hover:underline"
            >
              + Log Sighting
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sightings.map((s) => {
              const dog = dogs.find((d) => d.dog_id === s.dog_id)
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-warm-50 border border-warm-200 text-xs space-y-2 hover:border-forest-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-charcoal-900 text-sm">
                      {dog?.name || s.dog_name || 'Community Dog'}
                    </span>
                    <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded font-bold text-forest-900 border border-warm-300">
                      {s.dog_id || 'Unknown'}
                    </span>
                  </div>

                  <p className="text-charcoal-700 font-medium flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
                    <span className="line-clamp-1">{s.location.address}</span>
                  </p>

                  {s.health_observation && (
                    <p className="text-charcoal-500 text-[11px] line-clamp-2 leading-relaxed">
                      {s.health_observation}
                    </p>
                  )}

                  <div className="pt-2 border-t border-warm-200/80 flex items-center justify-between text-[10px] text-charcoal-400">
                    <span>{new Date(s.reported_at).toLocaleDateString()}</span>
                    <span>By {s.reporter_type}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* MODAL: Log Sighting */}
        {showSightingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Log Dog Sighting</h3>

              <form onSubmit={handleSubmitSighting} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Select Dog *</label>
                  <select
                    value={selectedDogId}
                    onChange={(e) => setSelectedDogId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    {dogs.map((d) => (
                      <option key={d.id} value={d.dog_id}>
                        {d.name} ({d.dog_id}) — {d.usual_area}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-charcoal-700">Location Landmark / Address *</label>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={locating}
                      className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>{locating ? 'Locating...' : 'Use Current GPS'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Near Gate 3 Central Park"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Latitude</label>
                    <input
                      type="text"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Longitude</label>
                    <input
                      type="text"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Observation Notes</label>
                  <textarea
                    rows={2}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="e.g. Resting near flower bed, appears well-nourished"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowSightingModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Save Sighting Location
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
