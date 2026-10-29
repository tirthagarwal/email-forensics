import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Activity,
  Plus,
  Search,
  Filter,
  Thermometer,
  Scale,
  HeartPulse,
  Info,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { StatusBadge } from '../../components/StatusBadge'
import { HealthObservation } from '../../lib/types'

export default function ActivityVitalsPage() {
  const { observations, dogs, addObservation, currentUser } = useRescueAI()

  const [searchQuery, setSearchQuery] = useState('')
  const [dogFilter, setDogFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  // Form State
  const [selectedDogId, setSelectedDogId] = useState(dogs[0]?.dog_id || 'RAI-DOG-0001')
  const [behavior, setBehavior] = useState<HealthObservation['activity_behavior']>('Normal & Energetic')
  const [appetite, setAppetite] = useState<HealthObservation['appetite']>('Normal')
  const [mobility, setMobility] = useState<HealthObservation['mobility']>('Normal')
  const [condition, setCondition] = useState<HealthObservation['general_condition']>('Good')
  const [injuries, setInjuries] = useState('')
  const [temp, setTemp] = useState('38.5')
  const [weight, setWeight] = useState('18.2')
  const [heartRate, setHeartRate] = useState('96')
  const [respRate, setRespRate] = useState('22')
  const [notes, setNotes] = useState('')

  const filteredObservations = observations.filter((o) => {
    if (dogFilter !== 'all' && o.dog_id !== dogFilter) return false

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const dog = dogs.find((d) => d.dog_id === o.dog_id)
      return (
        o.dog_id.toLowerCase().includes(q) ||
        (dog && dog.name.toLowerCase().includes(q)) ||
        o.activity_behavior.toLowerCase().includes(q) ||
        o.observer_name.toLowerCase().includes(q) ||
        (o.notes && o.notes.toLowerCase().includes(q))
      )
    }

    return true
  })

  // Sample Bruno Vitals Progression for chart (real records from state)
  const brunoObs = observations
    .filter((o) => o.dog_id === 'RAI-DOG-0001' && o.body_temperature_c)
    .map((o) => ({
      date: new Date(o.recorded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      temp: o.body_temperature_c,
      weight: o.weight_kg,
    }))

  const handleSubmitObservation = (e: React.FormEvent) => {
    e.preventDefault()

    addObservation({
      dog_id: selectedDogId,
      activity_behavior: behavior,
      appetite,
      mobility,
      visible_injuries: injuries.trim() || undefined,
      general_condition: condition,
      body_temperature_c: temp ? parseFloat(temp) : undefined,
      heart_rate_bpm: heartRate ? parseInt(heartRate) : undefined,
      respiratory_rate: respRate ? parseInt(respRate) : undefined,
      weight_kg: weight ? parseFloat(weight) : undefined,
      observer_name: currentUser?.full_name || 'David Martinez',
      observer_role: currentUser?.role || 'ngo_worker',
      notes: notes.trim(),
      triage_level: mobility === 'Limping' || condition === 'Poor' ? 'Needs Attention' : 'Normal',
    })

    setShowAddModal(false)
  }

  return (
    <DashboardLayout
      title="Field Observations & Vitals Monitoring"
      subtitle="Physical vital signs and behavioral examinations recorded by rescue staff"
      actions={
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft"
        >
          <Plus className="w-4 h-4" />
          <span>Record Vitals Observation</span>
        </button>
      }
    >
      <Head>
        <title>Activity & Vitals — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* MANDATORY DISCLAIMER BOX */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-teal-200 shadow-2xs text-xs text-charcoal-700 flex items-start gap-3">
          <Info className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-charcoal-900 text-sm">Hardware Clarification & Data Authenticity</h3>
            <p className="leading-relaxed text-charcoal-600">
              The RescueAI collar is an identification device containing a high-contrast QR tag. It does not automatically stream telemetry. All physiological measurements (body temperature, pulse, respiratory rate, weight) displayed below represent manual clinical measurements recorded during physical veterinary visits or field health checkups.
            </p>
          </div>
        </div>

        {/* VITALS TREND CHART (When data exists) */}
        {brunoObs.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-warm-200 shadow-soft space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-charcoal-900">
                  Vital Measurements Trend Over Time: Bruno (RAI-DOG-0001)
                </h3>
                <p className="text-xs text-charcoal-500">
                  Track body temperature (°C) and weight (kg) across physical examinations
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                Healthy Temperature Range (38.3°C – 39.2°C)
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={brunoObs}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={[37, 41]} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="temp"
                    name="Temperature (°C)"
                    stroke="#0f766e"
                    strokeWidth={3}
                    dot={{ fill: '#0f766e', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter observations by dog ID, behavior, observer, or notes..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-warm-200 text-xs sm:text-sm bg-warm-50/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-charcoal-400" />
            <select
              value={dogFilter}
              onChange={(e) => setDogFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700"
            >
              <option value="all">All Dogs</option>
              {dogs.map((d) => (
                <option key={d.id} value={d.dog_id}>
                  {d.name} ({d.dog_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* OBSERVATIONS TIMELINE */}
        <div className="space-y-4">
          {filteredObservations.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-warm-200 text-center text-xs text-charcoal-400">
              No measurements recorded for the selected filter.
            </div>
          ) : (
            filteredObservations.map((obs) => {
              const dog = dogs.find((d) => d.dog_id === obs.dog_id)
              return (
                <div
                  key={obs.id}
                  className="bg-white rounded-3xl p-6 border border-warm-200 shadow-2xs space-y-4 hover:border-forest-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-100 pb-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/dogs/${obs.dog_id}`}
                        className="flex items-center gap-2 group"
                      >
                        <img
                          src={dog?.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=100&auto=format&fit=crop&q=80'}
                          alt={dog?.name || obs.dog_id}
                          className="w-10 h-10 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-charcoal-900 group-hover:text-forest-900 text-sm">
                            {dog?.name || 'Stray Dog'}
                          </p>
                          <span className="font-mono text-[10px] text-charcoal-500">
                            {obs.dog_id}
                          </span>
                        </div>
                      </Link>

                      <div className="pl-3 border-l border-warm-200 text-xs">
                        <span className="font-bold text-forest-950 block">{obs.activity_behavior}</span>
                        <span className="text-[10px] text-charcoal-400">
                          {new Date(obs.recorded_at).toLocaleDateString()} at{' '}
                          {new Date(obs.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <StatusBadge status={obs.triage_level} size="sm" />
                  </div>

                  {/* Physical metrics display */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-warm-50 p-4 rounded-2xl text-xs">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Body Temp</span>
                        <span className="font-mono font-bold text-sm text-charcoal-900">
                          {obs.body_temperature_c ? `${obs.body_temperature_c}°C` : 'No measurement'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-teal-700 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Body Weight</span>
                        <span className="font-mono font-bold text-sm text-charcoal-900">
                          {obs.weight_kg ? `${obs.weight_kg} kg` : 'No measurement'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-forest-700 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Mobility</span>
                        <span className="font-bold text-sm text-charcoal-900">{obs.mobility}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-coral-600 flex-shrink-0" />
                      <div>
                        <span className="text-[10px] text-charcoal-400 block font-bold">Appetite</span>
                        <span className="font-bold text-sm text-charcoal-900">{obs.appetite}</span>
                      </div>
                    </div>
                  </div>

                  {obs.visible_injuries && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                      <strong>Observed Trauma:</strong> {obs.visible_injuries}
                    </div>
                  )}

                  {obs.notes && (
                    <p className="text-xs text-charcoal-600 leading-relaxed pl-1">{obs.notes}</p>
                  )}

                  <div className="pt-2 border-t border-warm-100 text-[11px] text-charcoal-400">
                    Logged by field inspector: <strong>{obs.observer_name}</strong> ({obs.observer_role})
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* MODAL: Record Observation */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Log Physical Vitals Observation</h3>

              <form onSubmit={handleSubmitObservation} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Select Dog *</label>
                  <select
                    value={selectedDogId}
                    onChange={(e) => setSelectedDogId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                  >
                    {dogs.map((d) => (
                      <option key={d.id} value={d.dog_id}>
                        {d.name} ({d.dog_id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Behavior *</label>
                    <select
                      value={behavior}
                      onChange={(e) => setBehavior(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                    >
                      <option value="Normal & Energetic">Normal & Energetic</option>
                      <option value="Lethargic">Lethargic</option>
                      <option value="Aggressive">Aggressive</option>
                      <option value="Shy / Hiding">Shy / Hiding</option>
                      <option value="Restless">Restless</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Mobility *</label>
                    <select
                      value={mobility}
                      onChange={(e) => setMobility(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Limping">Limping</option>
                      <option value="Reluctant to move">Reluctant to move</option>
                      <option value="Non-ambulatory">Non-ambulatory</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Temperature (°C measured)</label>
                    <input
                      type="text"
                      value={temp}
                      onChange={(e) => setTemp(e.target.value)}
                      placeholder="e.g. 38.5"
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Weight (kg measured)</label>
                    <input
                      type="text"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 18.2"
                      className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Visible Injuries (if any)</label>
                  <input
                    type="text"
                    value={injuries}
                    onChange={(e) => setInjuries(e.target.value)}
                    placeholder="e.g. Minor scratch on ear, no open wound"
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Field Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="General observations, feeding response..."
                    className="w-full px-3.5 py-2 rounded-xl border border-warm-300 text-xs"
                  />
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
                    Save Field Observation
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
