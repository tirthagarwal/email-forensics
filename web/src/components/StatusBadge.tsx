import React from 'react'
import { HealthStatus, VaccinationStatus, QRDeviceStatus, ReportStatus } from '../lib/types'

interface StatusBadgeProps {
  status: HealthStatus | VaccinationStatus | QRDeviceStatus | ReportStatus | string
  type?: 'health' | 'vaccination' | 'device' | 'report' | 'general'
  size?: 'sm' | 'md'
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'general', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold'

  // Health Status Styling
  if (type === 'health' || ['Healthy', 'Needs Treatment', 'Critical', 'Under Observation', 'Quarantined'].includes(status)) {
    switch (status) {
      case 'Healthy':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Healthy
          </span>
        )
      case 'Needs Treatment':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Needs Treatment
          </span>
        )
      case 'Critical':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-300 font-bold animate-pulse-subtle ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            Critical
          </span>
        )
      case 'Quarantined':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-900 border border-red-400 font-bold ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
            Quarantined (10-Day)
          </span>
        )
      case 'Under Observation':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Under Observation
          </span>
        )
    }
  }

  // Vaccination Status Styling
  if (type === 'vaccination' || ['Vaccinated', 'Due Soon', 'Overdue', 'Unvaccinated', 'Unknown', 'Verification Required'].includes(status)) {
    switch (status) {
      case 'Vaccinated':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-forest-50 text-forest-700 border border-forest-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-forest-600"></span>
            Vaccinated
          </span>
        )
      case 'Due Soon':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-300 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Due Soon
          </span>
        )
      case 'Overdue':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Overdue
          </span>
        )
      case 'Unvaccinated':
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-charcoal-100 text-charcoal-700 border border-charcoal-300 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-charcoal-400"></span>
            Unvaccinated
          </span>
        )
      case 'Verification Required':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            Verification Required
          </span>
        )
    }
  }

  // Devices & Reports Styling
  if (['Active', 'Resolved', 'Full Recovery'].includes(status)) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
        {status}
      </span>
    )
  }

  if (['Damaged', 'Lost', 'Rejected'].includes(status)) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses}`}>
        {status}
      </span>
    )
  }

  if (['New', 'In Progress', 'Assigned', 'Under Review'].includes(status)) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 ${sizeClasses}`}>
        {status}
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-charcoal-100 text-charcoal-700 border border-charcoal-200 ${sizeClasses}`}>
      {status}
    </span>
  )
}
