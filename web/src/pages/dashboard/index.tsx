import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Dog as DogIcon,
  Syringe,
  AlertTriangle,
  Clock,
  MapPin,
  QrCode,
  Heart,
  TrendingUp,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar,
  Activity,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { StatusBadge } from '../../components/StatusBadge'

export default function DashboardOverview() {
  const {
    dogs,
    vaccinations,
    medicalRecords,
    sightings,
    devices,
    communityReports,
    currentUser,
  } = useRescueAI()

  const [timeRange, setTimeRange] = useState<'30d' | '90d' | '1y'>('30d')

  // Calculate Summary Statistics
  const totalDogs = dogs.filter((d) => d.status === 'active').length
  const fullyVaccinated = dogs.filter((d) => d.vaccination_status === 'Vaccinated').length
  const awaitingVaccination = dogs.filter((d) => d.vaccination_status === 'Unvaccinated').length
  const dueSoonVaccination = dogs.filter((d) => d.vaccination_status === 'Due Soon').length
  const overdueVaccination = dogs.filter((d) => d.vaccination_status === 'Overdue').length
  const requiringAttention = dogs.filter(
    (d) => d.health_status === 'Needs Treatment' || d.health_status === 'Critical' || d.health_status === 'Quarantined'
  ).length
  const activeTags = devices.filter((dev) => dev.qr_status === 'Active').length
  const recentSightingsCount = sightings.length

  // Coverage percentage
  const coveragePercent = totalDogs > 0 ? Math.round((fullyVaccinated / totalDogs) * 100) : 0

  // Chart 1: Vaccination Status Breakdown
  const vaccinationData = [
    { name: 'Vaccinated', value: fullyVaccinated, color: '#166534' },
    { name: 'Due Soon', value: dueSoonVaccination, color: '#f59e0b' },
    { name: 'Overdue', value: overdueVaccination, color: '#f43f5e' },
    { name: 'Unvaccinated', value: awaitingVaccination, color: '#64748b' },
  ]

  // Chart 2: Vaccination Coverage Over Time (Monthly Trend)
  const coverageTrendData = [
    { month: 'May 2026', coverage: 42, registered: 8, vaccinated: 4 },
    { month: 'Jun 2026', coverage: 50, registered: 10, vaccinated: 5 },
    { month: 'Jul 2026', coverage: 55, registered: 11, vaccinated: 6 },
    { month: 'Aug 2026', coverage: 61, registered: 12, vaccinated: 7 },
    { month: 'Sep 2026', coverage: 68, registered: 13, vaccinated: 9 },
    { month: 'Oct 2026', coverage: coveragePercent, registered: totalDogs, vaccinated: fullyVaccinated },
  ]

  // Chart 3: Medical Cases by Category
  const categoryCounts: Record<string, number> = {}
  medicalRecords.forEach((m) => {
    categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1
  })
  const medicalCategoryData = Object.keys(categoryCounts).map((cat) => ({
    category: cat.length > 15 ? cat.substring(0, 14) + '...' : cat,
    cases: categoryCounts[cat],
  }))

  // Chart 4: Dogs by Area
  const areaCounts: Record<string, number> = {}
  dogs.forEach((d) => {
    const area = d.usual_area.split('&')[0].trim().split(',')[0].trim()
    areaCounts[area] = (areaCounts[area] || 0) + 1
  })
  const areaData = Object.keys(areaCounts).slice(0, 5).map((a) => ({
    area: a.length > 16 ? a.substring(0, 15) + '..' : a,
    count: areaCounts[a],
  }))

  return (
    <DashboardLayout
      title="Platform Operations Overview"
      subtitle="Stray dog census, vaccination coverage, and field health intelligence"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/dogs/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Dog</span>
          </Link>
          <Link
            href="/scan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl shadow-2xs"
          >
            <QrCode className="w-4 h-4 text-teal-700" />
            <span>Scan QR</span>
          </Link>
        </div>
      }
    >
      <Head>
        <title>Dashboard Overview — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* TOP SUMMARY CARDS (8 CARDS) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Dogs */}
          <Link
            href="/dashboard/dogs"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-forest-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Total Registered Dogs</span>
              <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <DogIcon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-charcoal-900 mt-2 font-mono">
              {totalDogs}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-teal-700 font-medium mt-1">
              <span>{activeTags} Active QR Collars</span>
            </div>
          </Link>

          {/* Card 2: Fully Vaccinated */}
          <Link
            href="/dashboard/vaccinations?status=Vaccinated"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-forest-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Fully Vaccinated</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Syringe className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-800 mt-2 font-mono">
              {fullyVaccinated}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium mt-1">
              <span>{coveragePercent}% Herd Coverage</span>
            </div>
          </Link>

          {/* Card 3: Due Soon */}
          <Link
            href="/dashboard/vaccinations?status=Due Soon"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-amber-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Boosters Due Soon</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-800 mt-2 font-mono">
              {dueSoonVaccination}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium mt-1">
              <span>Next 30-day window</span>
            </div>
          </Link>

          {/* Card 4: Vaccinations Overdue */}
          <Link
            href="/dashboard/vaccinations?status=Overdue"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-rose-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Vaccinations Overdue</span>
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-700 mt-2 font-mono">
              {overdueVaccination}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
              <span>Immediate recall required</span>
            </div>
          </Link>

          {/* Card 5: Dogs Requiring Medical Attention */}
          <Link
            href="/dashboard/medical"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-coral-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Medical Attention</span>
              <div className="w-8 h-8 rounded-xl bg-coral-100 text-coral-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Heart className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-coral-800 mt-2 font-mono">
              {requiringAttention}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-coral-700 font-medium mt-1">
              <span>Injuries & Quarantine</span>
            </div>
          </Link>

          {/* Card 6: Awaiting Primary Immunization */}
          <Link
            href="/dashboard/vaccinations?status=Unvaccinated"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-charcoal-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Awaiting Vaccines</span>
              <div className="w-8 h-8 rounded-xl bg-charcoal-100 text-charcoal-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Syringe className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-charcoal-800 mt-2 font-mono">
              {awaitingVaccination}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-charcoal-500 font-medium mt-1">
              <span>Pups & New rescues</span>
            </div>
          </Link>

          {/* Card 7: Recent Sightings */}
          <Link
            href="/dashboard/map"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-forest-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Field Sightings</span>
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <MapPin className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-charcoal-900 mt-2 font-mono">
              {recentSightingsCount}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-teal-700 font-medium mt-1">
              <span>Logged by citizens & staff</span>
            </div>
          </Link>

          {/* Card 8: Active QR Tags */}
          <Link
            href="/dashboard/devices"
            className="bg-white p-5 rounded-2xl border border-warm-200 shadow-2xs hover:shadow-soft hover:border-forest-400 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-500">Active Collar Tags</span>
              <div className="w-8 h-8 rounded-xl bg-forest-100 text-forest-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                <QrCode className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-forest-900 mt-2 font-mono">
              {activeTags}
            </p>
            <div className="flex items-center gap-1 text-[11px] text-forest-700 font-medium mt-1">
              <span>Online QR Medallions</span>
            </div>
          </Link>
        </div>

        {/* INTERACTIVE CHARTS ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 1: Vaccination Status Pie/Donut */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-warm-200 shadow-soft flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-charcoal-900 text-sm">Vaccination Status Distribution</h3>
                  <p className="text-xs text-charcoal-500">Immunity coverage breakdown</p>
                </div>
                <span className="font-mono font-bold text-xs bg-forest-50 text-forest-800 px-2 py-1 rounded-lg border border-forest-200">
                  {coveragePercent}% Immune
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={vaccinationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {vaccinationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any, name: any) => [`${value} dogs`, name]}
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-warm-100 text-xs">
              {vaccinationData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-charcoal-600 truncate">{item.name}:</span>
                  <span className="font-mono font-bold text-charcoal-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2: Vaccination Coverage Over Time (Area Chart) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-warm-200 shadow-soft flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-charcoal-900 text-sm">Herd Immunity Progress (%)</h3>
                <p className="text-xs text-charcoal-500">Monthly vaccination campaign trajectory</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-forest-800 bg-forest-50 px-2.5 py-1 rounded-lg border border-forest-200 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+26% in 6 months</span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={coverageTrendData}>
                  <defs>
                    <linearGradient id="coverageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Coverage']}
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="coverage"
                    stroke="#0d9488"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#coverageGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-charcoal-400 text-center pt-2">
              Benchmark: The World Health Organization (WHO) targets ≥70% coverage to prevent canine rabies transmission.
            </p>
          </div>
        </div>

        {/* INTERACTIVE CHARTS ROW 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart 3: Medical Cases by Category */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-warm-200 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-charcoal-900 text-sm">Medical Cases by Category</h3>
                <p className="text-xs text-charcoal-500">Treatments administered by clinical category</p>
              </div>
              <Link href="/dashboard/medical" className="text-xs font-semibold text-teal-700 hover:underline">
                View All Records →
              </Link>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={medicalCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="cases" fill="#0f766e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Dogs Registered by Area */}
          <div className="lg:col-span-6 bg-white p-6 rounded-3xl border border-warm-200 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-charcoal-900 text-sm">Canine Density by Municipal Sector</h3>
                <p className="text-xs text-charcoal-500">Identified pack territories and usual areas</p>
              </div>
              <Link href="/dashboard/map" className="text-xs font-semibold text-teal-700 hover:underline">
                View Full Map →
              </Link>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="area" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} width={120} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="count" fill="#15803d" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RECENT DOG SIGHTINGS & PRIORITY COMMUNITY REPORTS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Priority Dogs Requiring Action */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-warm-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-warm-100">
              <div>
                <h3 className="font-bold text-charcoal-900 text-sm">Dogs Requiring Field Attention</h3>
                <p className="text-xs text-charcoal-500">Quarantine, injuries, or overdue vaccinations</p>
              </div>
              <Link href="/dashboard/dogs" className="text-xs font-semibold text-forest-800 hover:underline">
                All Dogs ({dogs.length})
              </Link>
            </div>

            <div className="divide-y divide-warm-100">
              {dogs
                .filter(
                  (d) =>
                    d.health_status === 'Critical' ||
                    d.health_status === 'Quarantined' ||
                    d.health_status === 'Needs Treatment' ||
                    d.vaccination_status === 'Overdue'
                )
                .slice(0, 4)
                .map((dog) => (
                  <div key={dog.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={dog.photo_url}
                        alt={dog.name}
                        className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-charcoal-900 truncate">{dog.name}</p>
                          <span className="font-mono text-[10px] bg-warm-100 px-1.5 py-0.5 rounded font-semibold text-charcoal-700">
                            {dog.dog_id}
                          </span>
                        </div>
                        <p className="text-[11px] text-charcoal-500 truncate mt-0.5">{dog.usual_area}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={dog.health_status} type="health" size="sm" />
                      <Link
                        href={`/dashboard/dogs/${dog.dog_id}`}
                        className="p-1.5 rounded-lg text-charcoal-400 hover:text-forest-800 hover:bg-warm-100"
                        title="View Profile"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Right: Latest Community Citizen Reports */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-warm-200 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-warm-100">
              <div>
                <h3 className="font-bold text-charcoal-900 text-sm">Recent Citizen Reports</h3>
                <p className="text-xs text-charcoal-500">Incoming community alerts</p>
              </div>
              <Link href="/dashboard/reports" className="text-xs font-semibold text-forest-800 hover:underline">
                View All ({communityReports.length})
              </Link>
            </div>

            <div className="space-y-3">
              {communityReports.slice(0, 3).map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-2xl bg-warm-50 border border-warm-200 text-xs space-y-1.5 hover:border-forest-400 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-forest-900 text-[11px]">
                      {rep.reference_number}
                    </span>
                    <StatusBadge status={rep.status} size="sm" />
                  </div>
                  <p className="font-bold text-charcoal-900">{rep.report_type}</p>
                  <p className="text-charcoal-600 text-[11px] line-clamp-2 leading-relaxed">
                    {rep.description}
                  </p>
                  <p className="text-[10px] text-charcoal-400 pt-1">
                    📍 {rep.location.address}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
