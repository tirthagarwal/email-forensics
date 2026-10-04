'use client'
import React, { useState } from 'react'
import { ForensicReport, SecurityControl } from '@/types/report'
import { getStatusBadge, getStatusColor } from '@/lib/utils'
import { ChevronDown, ChevronUp, Shield } from 'lucide-react'

interface AssessmentPageProps { report: ForensicReport }

function ControlRow({ ctrl }: { ctrl: SecurityControl }) {
  const [expanded, setExpanded] = useState(false)
  const accentColor = getStatusColor(ctrl.status)

  return (
    <div className="border border-bg-border rounded-xl overflow-hidden"
         style={{ borderLeftColor: accentColor, borderLeftWidth: 3 }}>
      <button
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
          <div>
            <p className="text-sm font-semibold text-text-primary">{ctrl.name}</p>
            <p className="text-xs text-text-muted mt-0.5">{ctrl.category?.replace(/_/g, ' ')}</p>
          </div>
          <span className="text-xs text-text-secondary truncate max-w-[200px]">{ctrl.observed}</span>
          <span className={getStatusBadge(ctrl.status)}>{ctrl.status}</span>
          {ctrl.score_contribution > 0 && (
            <span className="text-xs font-mono text-red">+{ctrl.score_contribution} pts</span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
        }
      </button>

      {expanded && (
        <div className="border-t border-bg-border bg-bg-surface/50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Observed</p>
              <p className="text-text-secondary">{ctrl.observed}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Expected</p>
              <p className="text-text-secondary">{ctrl.expected}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Why</p>
              <p className="text-text-secondary">{ctrl.why}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Evidence</p>
              <p className="text-text-secondary mono text-xs bg-bg-muted rounded-lg p-2">{ctrl.evidence}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Recommendation</p>
              <p className="text-text-secondary">{ctrl.recommendation}</p>
            </div>
            {ctrl.severity && (
              <div className="flex gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Severity</p>
                  <span className={`text-xs font-semibold ${ctrl.severity === 'HIGH' || ctrl.severity === 'CRITICAL' ? 'text-red' :
                    ctrl.severity === 'MEDIUM' ? 'text-amber' : 'text-text-muted'}`}>
                    {ctrl.severity}
                  </span>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">Risk Impact</p>
                  <span className={ctrl.score_contribution > 0 ? 'text-xs font-mono text-red' : 'text-xs text-text-muted'}>
                    {ctrl.score_contribution > 0 ? `+${ctrl.score_contribution} pts` : 'None'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AssessmentPage({ report }: AssessmentPageProps) {
  const { security_assessment } = report
  const controls  = security_assessment?.controls ?? []
  const violations = security_assessment?.violations ?? []
  const [filter, setFilter] = useState<string>('ALL')

  const allControls = [...violations, ...controls]
  const statuses = ['ALL', 'PASS', 'WARNING', 'VIOLATION', 'NOT OBSERVED']
  const filtered = filter === 'ALL' ? allControls : allControls.filter(c => c.status === filter)

  const stats = {
    total: allControls.length,
    pass: allControls.filter(c => c.status === 'PASS').length,
    warn: allControls.filter(c => c.status === 'WARNING').length,
    violation: allControls.filter(c => c.status === 'VIOLATION').length,
    notObserved: allControls.filter(c => c.status === 'NOT OBSERVED').length,
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue" /> Security Assessment
          </h2>
          <p className="text-xs text-text-muted mt-1">
            {stats.total} controls evaluated · Scores from passive forensic analysis
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-green">{stats.pass} PASS</span>
          <span className="text-amber">{stats.warn} WARN</span>
          <span className="text-red">{stats.violation} FAIL</span>
        </div>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Baseline Score', value: security_assessment?.baseline_score ?? 0, color: '#38bdf8' },
          { label: 'Crypto Score',   value: security_assessment?.cryptographic_score ?? 0, color: '#f59e0b' },
          { label: 'Final Score',    value: security_assessment?.final_score ?? 0, color: '#f43f5e' },
          { label: 'Score Delta',    value: `+${security_assessment?.score_delta ?? 0}`, color: '#a78bfa' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    filter === s
                      ? 'bg-blue/15 border-blue/40 text-blue'
                      : 'bg-bg-muted border-bg-border text-text-muted hover:text-text-primary'}`}>
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-muted self-center">{filtered.length} controls</span>
      </div>

      {/* Control cards */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-text-muted text-center py-8">No controls matching filter.</p>
        )}
        {filtered.map((ctrl, i) => <ControlRow key={i} ctrl={ctrl} />)}
      </div>
    </div>
  )
}
