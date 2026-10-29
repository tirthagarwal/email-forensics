import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Syringe,
  Stethoscope,
  Heart,
  Tag,
  Filter,
  Check,
  ExternalLink,
  ShieldAlert
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'

export default function AlertsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useRescueAI()

  const [severityFilter, setSeverityFilter] = useState('all')

  const filteredNotifs = notifications.filter((n) => {
    if (severityFilter !== 'all' && n.severity !== severityFilter) return false
    return true
  })

  return (
    <DashboardLayout
      title="Alerts, Reminders & Escalations"
      subtitle="Automated notification centre for upcoming booster doses, urgent reports, and quarantine cases"
      actions={
        <button
          onClick={markAllNotificationsRead}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-charcoal-700 bg-white hover:bg-warm-100 border border-warm-300 rounded-xl"
        >
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Mark All Read</span>
        </button>
      }
    >
      <Head>
        <title>Alerts & Reminders — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-charcoal-400" />
            <span className="font-semibold text-charcoal-700">Filter by Severity:</span>
            <div className="flex items-center gap-1">
              {['all', 'critical', 'warning', 'info'].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                    severityFilter === sev
                      ? 'bg-forest-800 text-white font-bold'
                      : 'bg-warm-50 text-charcoal-600 hover:bg-warm-100'
                  }`}
                >
                  {sev === 'all' ? `All (${notifications.length})` : sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NOTIFICATIONS LIST */}
        <div className="space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-warm-200 text-center text-xs text-charcoal-400">
              No notifications matching the selected filter.
            </div>
          ) : (
            filteredNotifs.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                  !n.is_read
                    ? n.severity === 'critical'
                      ? 'bg-rose-50/70 border-rose-300 shadow-soft'
                      : 'bg-white border-forest-300 shadow-soft'
                    : 'bg-white/80 border-warm-200 shadow-2xs opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        n.severity === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : n.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {n.severity === 'critical' ? (
                        <ShieldAlert className="w-5 h-5" />
                      ) : n.severity === 'warning' ? (
                        <AlertTriangle className="w-5 h-5" />
                      ) : (
                        <Bell className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-bold text-sm ${n.severity === 'critical' ? 'text-rose-950 font-black' : 'text-charcoal-900'}`}>
                          {n.title}
                        </h3>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-coral-500 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-xs text-charcoal-600 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-charcoal-400 block pt-1">
                        Triggered on {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {n.dog_id && (
                      <Link
                        href={`/dashboard/dogs/${n.dog_id}`}
                        className="px-3 py-1.5 bg-warm-100 hover:bg-forest-100 hover:text-forest-900 rounded-xl text-xs font-bold text-charcoal-700 flex items-center gap-1"
                      >
                        <span>View {n.dog_id}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    {n.report_id && (
                      <Link
                        href={`/dashboard/reports`}
                        className="px-3 py-1.5 bg-warm-100 hover:bg-forest-100 hover:text-forest-900 rounded-xl text-xs font-bold text-charcoal-700 flex items-center gap-1"
                      >
                        <span>Review Report</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
