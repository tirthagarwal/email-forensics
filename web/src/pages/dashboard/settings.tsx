import React, { useState } from 'react'
import Head from 'next/head'
import {
  Settings,
  Building,
  Bell,
  Eye,
  Database,
  RotateCcw,
  CheckCircle2,
  Shield,
  Save,
  Server
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { getSupabaseStatus } from '../../lib/supabaseClient'

export default function SettingsPage() {
  const { currentUser, isDemoMode, resetToDemoData } = useRescueAI()
  const supabaseStatus = getSupabaseStatus()

  const [orgName, setOrgName] = useState('Paws & Hope Animal Welfare Trust')
  const [helpline, setHelpline] = useState('+1 (800) 555-PAWS')
  const [address, setAddress] = useState('42 Meadow Lane, Central District')
  const [boosterWindow, setBoosterWindow] = useState('30')
  const [showVacStatus, setShowVacStatus] = useState(true)
  const [showHelpline, setShowHelpline] = useState(true)
  const [showMedicalSummary, setShowMedicalSummary] = useState(true)
  const [allowCitizenReports, setAllowCitizenReports] = useState(true)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <DashboardLayout
      title="System & Organisation Settings"
      subtitle="Configure reminder thresholds, public QR visibility, and database connectivity"
      actions={
        savedSuccess ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>Settings Saved</span>
          </span>
        ) : null
      }
    >
      <Head>
        <title>Settings — RescueAI</title>
      </Head>

      <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
        {/* SECTION 1: ORGANISATION PROFILE */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-warm-100 pb-3">
            <Building className="w-5 h-5 text-forest-800" />
            <h3 className="font-bold text-base text-charcoal-900">
              Organisation Profile & Citizen Hotline
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Organisation Legal Name</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Emergency Rescue Helpline (Shown on QR Tags)</label>
              <input
                type="text"
                value={helpline}
                onChange={(e) => setHelpline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm font-mono font-bold text-forest-900"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="font-bold text-charcoal-700">Headquarters / Dispatch Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm"
            />
          </div>
        </div>

        {/* SECTION 2: VACCINATION REMINDER INTERVALS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-warm-100 pb-3">
            <Bell className="w-5 h-5 text-teal-700" />
            <h3 className="font-bold text-base text-charcoal-900">
              Vaccination Recall & Booster Rules
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Due Soon Notification Trigger</label>
              <select
                value={boosterWindow}
                onChange={(e) => setBoosterWindow(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
              >
                <option value="14">14 Days Prior to Booster Deadline</option>
                <option value="30">30 Days Prior (Recommended WHO Standard)</option>
                <option value="60">60 Days Prior</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-charcoal-700">Duplicate Prevention Timeframe</label>
              <input
                type="text"
                disabled
                value="60 Days (Strict Safety Engine Active)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-warm-200 bg-warm-50 text-sm font-semibold text-charcoal-600"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PUBLIC QR PROFILE PERMISSIONS */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-warm-100 pb-3">
            <Eye className="w-5 h-5 text-coral-600" />
            <h3 className="font-bold text-base text-charcoal-900">
              Public QR Collar Profile Configuration
            </h3>
          </div>
          <p className="text-xs text-charcoal-500">
            Control which fields are visible to citizens scanning collar QR codes in public without login:
          </p>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-warm-50 border border-warm-200 cursor-pointer">
              <div>
                <span className="font-bold text-charcoal-900 block">Display Verified Vaccination Immunity Status</span>
                <span className="text-[11px] text-charcoal-500">Allows citizens to confirm the dog is immunized against Rabies.</span>
              </div>
              <input
                type="checkbox"
                checked={showVacStatus}
                onChange={(e) => setShowVacStatus(e.target.checked)}
                className="w-5 h-5 rounded text-forest-800 focus:ring-forest-600"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-warm-50 border border-warm-200 cursor-pointer">
              <div>
                <span className="font-bold text-charcoal-900 block">Display Emergency Helpline Contact</span>
                <span className="text-[11px] text-charcoal-500">Shows the NGO emergency telephone number for swift reporting.</span>
              </div>
              <input
                type="checkbox"
                checked={showHelpline}
                onChange={(e) => setShowHelpline(e.target.checked)}
                className="w-5 h-5 rounded text-forest-800 focus:ring-forest-600"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-warm-50 border border-warm-200 cursor-pointer">
              <div>
                <span className="font-bold text-charcoal-900 block">Display Shareable Recovery Summary</span>
                <span className="text-[11px] text-charcoal-500">Shows non-confidential treatment progress notes (e.g. recovering paw).</span>
              </div>
              <input
                type="checkbox"
                checked={showMedicalSummary}
                onChange={(e) => setShowMedicalSummary(e.target.checked)}
                className="w-5 h-5 rounded text-forest-800 focus:ring-forest-600"
              />
            </label>
          </div>
        </div>

        {/* SECTION 4: DATABASE & SUPABASE CONNECTION */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
          <div className="flex items-center gap-2 border-b border-warm-100 pb-3">
            <Server className="w-5 h-5 text-forest-800" />
            <h3 className="font-bold text-base text-charcoal-900">
              Database & Cloud Infrastructure
            </h3>
          </div>

          <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-charcoal-700">Storage Mode:</span>
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                {isDemoMode ? 'Local Persistent Storage (Demo Mode Active)' : 'Supabase PostgreSQL Connected'}
              </span>
            </div>

            <div className="flex items-center justify-between text-charcoal-600">
              <span>Supabase Endpoint:</span>
              <span className="font-mono text-[11px]">{supabaseStatus.url}</span>
            </div>

            <div className="pt-2 border-t border-warm-200 flex items-center justify-between">
              <span className="text-[11px] text-charcoal-500">
                Need to reset sample demonstration data to default records?
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset demo database to fresh sample records? Any locally created dogs or records will be reset.')) {
                    resetToDemoData()
                    alert('Demo records successfully refreshed.')
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-charcoal-700 bg-white hover:bg-warm-100 rounded-lg border border-warm-300"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Records</span>
              </button>
            </div>
          </div>
        </div>

        {/* SAVE CTA BUTTON */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3.5 bg-forest-800 hover:bg-forest-900 text-white font-bold text-sm rounded-2xl shadow-soft hover:shadow-soft-lg transition-all flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings Changes</span>
          </button>
        </div>
      </form>
    </DashboardLayout>
  )
}
