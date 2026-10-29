import React, { useState } from 'react'
import Head from 'next/head'
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  TrendingUp,
  FileText,
  Shield,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'

export default function AnalyticsPage() {
  const { dogs, vaccinations, medicalRecords } = useRescueAI()

  const [reportingPeriod, setReportingPeriod] = useState('2026-YTD')
  const [selectedOrg, setSelectedOrg] = useState('all')

  const totalDogs = dogs.length
  const fullyVaccinated = dogs.filter((d) => d.vaccination_status === 'Vaccinated').length
  const overdueVaccinations = dogs.filter((d) => d.vaccination_status === 'Overdue').length
  const unresolvedMedical = dogs.filter((d) => d.health_status === 'Needs Treatment' || d.health_status === 'Critical' || d.health_status === 'Quarantined').length
  const coverageRate = totalDogs > 0 ? Math.round((fullyVaccinated / totalDogs) * 100) : 0

  // Chart: Monthly Activity Registrations & Vaccinations
  const monthlyData = [
    { month: 'May 26', registrations: 3, vaccinations: 4 },
    { month: 'Jun 26', registrations: 2, vaccinations: 5 },
    { month: 'Jul 26', registrations: 1, vaccinations: 3 },
    { month: 'Aug 26', registrations: 3, vaccinations: 6 },
    { month: 'Sep 26', registrations: 2, vaccinations: 4 },
    { month: 'Oct 26', registrations: 3, vaccinations: 7 },
  ]

  // Chart: Sex & Sterilization
  const sterilizedCount = dogs.filter((d) => d.sterilization_status === 'Sterilized').length
  const intactCount = dogs.filter((d) => d.sterilization_status === 'Intact').length
  const sterilizationData = [
    { name: 'Sterilized (ABC)', value: sterilizedCount, color: '#166534' },
    { name: 'Intact Canines', value: intactCount, color: '#f59e0b' },
  ]

  const handlePrintReport = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const headers = ['Metric', 'Value', 'Reporting Period', 'Status']
    const rows = [
      ['Total Registered Canines', totalDogs, reportingPeriod, 'Active'],
      ['Fully Immunized (Rabies Protected)', fullyVaccinated, reportingPeriod, `${coverageRate}% Coverage`],
      ['Overdue Immunizations', overdueVaccinations, reportingPeriod, 'Recall Required'],
      ['Active Medical / Quarantine Cases', unresolvedMedical, reportingPeriod, 'Under Treatment'],
      ['Sterilized Canines (ABC Coverage)', sterilizedCount, reportingPeriod, `${Math.round((sterilizedCount/totalDogs)*100)}% ABC`],
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `RescueAI_Executive_Report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <DashboardLayout
      title="Analytics, Metrics & Official Reports"
      subtitle="Epidemiological indicators, vaccination coverage benchmarks, and CSV exports"
      actions={
        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrintReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Report</span>
          </button>
        </div>
      }
    >
      <Head>
        <title>Analytics & Reports — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* OFFICIAL PRINTABLE REPORT CONTAINER */}
        <div className="printable-area bg-white rounded-3xl p-6 sm:p-10 border border-warm-200 shadow-soft space-y-6">
          {/* Official Report Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-warm-200 pb-6">
            <div>
              <div className="flex items-center gap-2 text-forest-900 mb-1">
                <Shield className="w-6 h-6" />
                <span className="text-xl font-black tracking-tight">RescueAI Animal Welfare Systems</span>
              </div>
              <h1 className="text-lg font-bold text-charcoal-900">
                Quarterly Canine Welfare, Rabies & Vaccination Coverage Audit
              </h1>
              <p className="text-xs text-charcoal-500">
                Generated: {new Date().toLocaleDateString()} • Reporting Period: {reportingPeriod} • Status: Certified Sample Audit
              </p>
            </div>

            <div className="text-right text-xs text-charcoal-500">
              <span className="font-bold text-charcoal-800 block">Metro Municipal Authority Partner</span>
              <span>Ref: RAI-AUDIT-2026-Q4</span>
            </div>
          </div>

          {/* Metric KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200">
              <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Total Canines Monitored</span>
              <p className="text-2xl font-black text-charcoal-900 font-mono mt-1">{totalDogs}</p>
              <p className="text-[11px] text-teal-800 mt-1 font-semibold">100% Unique QR Identity</p>
            </div>

            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200">
              <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Immunity Coverage</span>
              <p className="text-2xl font-black text-forest-900 font-mono mt-1">{coverageRate}%</p>
              <p className="text-[11px] text-forest-700 mt-1 font-semibold">{fullyVaccinated} Protected Canines</p>
            </div>

            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200">
              <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Overdue Immunizations</span>
              <p className="text-2xl font-black text-rose-700 font-mono mt-1">{overdueVaccinations}</p>
              <p className="text-[11px] text-rose-600 mt-1 font-semibold">Recall Required</p>
            </div>

            <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200">
              <span className="text-[10px] uppercase font-bold text-charcoal-400 block">Active Clinical Cases</span>
              <p className="text-2xl font-black text-coral-800 font-mono mt-1">{unresolvedMedical}</p>
              <p className="text-[11px] text-coral-700 mt-1 font-semibold">Under Treatment</p>
            </div>
          </div>

          {/* Monthly Registrations & Vaccinations Chart */}
          <div className="space-y-2 pt-2">
            <h3 className="text-sm font-bold text-charcoal-900">
              Monthly Registrations vs Vaccination Administrations
            </h3>
            <div className="h-64 w-full bg-warm-50/50 p-4 rounded-2xl border border-warm-200">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', fontSize: '12px' }}
                  />
                  <Legend />
                  <Bar dataKey="registrations" name="New Tagged Canines" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="vaccinations" name="Vaccines Administered" fill="#166534" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Audit Statement */}
          <div className="p-4 bg-warm-50 rounded-2xl border border-warm-200 text-xs text-charcoal-600 space-y-1">
            <p className="font-bold text-charcoal-900">Executive Summary & Compliance Statement:</p>
            <p className="leading-relaxed">
              Rabies vaccination coverage across registered territories is currently evaluated at <strong>{coverageRate}%</strong>. All vaccinated dogs hold verified digital certificates accessible through collar medallions. The target goal of 70% herd immunity recommended by the World Health Organization (WHO) is strictly monitored.
            </p>
          </div>

          {/* Signoff Blocks */}
          <div className="pt-6 border-t border-warm-200 grid grid-cols-2 gap-8 text-xs text-charcoal-600">
            <div>
              <p className="font-bold text-charcoal-900">Chief Veterinary Officer</p>
              <p className="text-[11px] text-charcoal-400">Dr. Arun Patel, DVM</p>
              <div className="w-32 border-b border-charcoal-400 mt-6"></div>
            </div>
            <div className="text-right">
              <p className="font-bold text-charcoal-900">Municipal Animal Welfare Cell</p>
              <p className="text-[11px] text-charcoal-400">Officer Clara Vance</p>
              <div className="w-32 border-b border-charcoal-400 mt-6 ml-auto"></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
