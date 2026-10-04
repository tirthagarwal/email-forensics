'use client'
import React, { useState } from 'react'
import { ForensicReport, Finding } from '@/types/report'
import { AlertTriangle, ShieldAlert, Filter, Search, ChevronDown, ChevronUp, ExternalLink, CheckCircle } from 'lucide-react'

interface FindingsPageProps {
  report: ForensicReport
}

export default function FindingsPage({ report }: FindingsPageProps) {
  const { findings = [], finding_groups = {} } = report
  const [severityFilter, setSeverityFilter] = useState('ALL')
  const [protocolFilter, setProtocolFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({ 0: true })

  const toggleExpand = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Filtered list
  const filteredFindings = findings.filter((f) => {
    const matchesSeverity = severityFilter === 'ALL' || f.severity.toUpperCase() === severityFilter
    const matchesProtocol = protocolFilter === 'ALL' || f.affected_protocol.toUpperCase() === protocolFilter
    const matchesSearch =
      search === '' ||
      f.title.toLowerCase().includes(search.toLowerCase()) ||
      f.rule_id.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase()) ||
      f.affected_connection.toLowerCase().includes(search.toLowerCase())

    return matchesSeverity && matchesProtocol && matchesSearch
  })

  // Severity counts
  const severityCounts = {
    CRITICAL: findings.filter((f) => f.severity === 'CRITICAL').length,
    HIGH: findings.filter((f) => f.severity === 'HIGH').length,
    MEDIUM: findings.filter((f) => f.severity === 'MEDIUM').length,
    LOW: findings.filter((f) => f.severity === 'LOW').length,
    INFO: findings.filter((f) => f.severity === 'INFO').length,
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red" /> Deterministic Security Findings
          </h2>
          <p className="text-xs text-text-muted mt-1">
            RFC-grounded policy violations, cleartext credentials exposure, and cryptographic weaknesses detected by rule engines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md bg-bg-card border border-bg-border text-text-secondary">
            Total Findings: <b className="text-text-primary">{findings.length}</b>
          </span>
        </div>
      </div>

      {/* Severity Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'CRITICAL', count: severityCounts.CRITICAL, color: '#ef4444' },
          { label: 'HIGH', count: severityCounts.HIGH, color: '#f43f5e' },
          { label: 'MEDIUM', count: severityCounts.MEDIUM, color: '#f59e0b' },
          { label: 'LOW', count: severityCounts.LOW, color: '#38bdf8' },
          { label: 'INFO', count: severityCounts.INFO, color: '#8da4bf' },
        ].map(({ label, count, color }) => (
          <button
            key={label}
            onClick={() => setSeverityFilter(severityFilter === label ? 'ALL' : label)}
            className={`card text-left p-3.5 transition-all ${
              severityFilter === label ? 'ring-2 ring-blue/50' : 'hover:border-bg-border'
            }`}
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
          >
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">{label}</span>
            <p className="text-xl font-bold mt-1" style={{ color }}>{count}</p>
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Rule ID, title, affected IP, impact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-bg-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Severity:
          </span>
          <div className="flex flex-wrap gap-1">
            {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`text-xs px-2.5 py-1 rounded border transition-all ${
                  severityFilter === s
                    ? 'bg-blue/15 border-blue/40 text-blue font-semibold'
                    : 'bg-bg-surface border-bg-border text-text-muted hover:text-text-primary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Protocol:
          </span>
          <div className="flex gap-1">
            {['ALL', 'SMTP', 'IMAP', 'POP3'].map((p) => (
              <button
                key={p}
                onClick={() => setProtocolFilter(p)}
                className={`text-xs px-2.5 py-1 rounded border transition-all ${
                  protocolFilter === p
                    ? 'bg-blue/15 border-blue/40 text-blue font-semibold'
                    : 'bg-bg-surface border-bg-border text-text-muted hover:text-text-primary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        {filteredFindings.length === 0 ? (
          <div className="card p-12 text-center text-text-muted">
            No security findings matching current filters.
          </div>
        ) : (
          filteredFindings.map((finding, idx) => {
            const isExpanded = !!expandedIndices[idx]
            const severityColor =
              finding.severity === 'HIGH' || finding.severity === 'CRITICAL'
                ? '#f43f5e'
                : finding.severity === 'MEDIUM'
                ? '#f59e0b'
                : '#38bdf8'

            return (
              <div
                key={idx}
                className="card p-0 overflow-hidden border-bg-border transition-all"
                style={{ borderLeftColor: severityColor, borderLeftWidth: 4 }}
              >
                {/* Finding Header Bar */}
                <div
                  onClick={() => toggleExpand(idx)}
                  className="p-4 cursor-pointer flex items-center justify-between gap-4 hover:bg-bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded font-mono"
                      style={{
                        background: `${severityColor}15`,
                        color: severityColor,
                        border: `1px solid ${severityColor}40`,
                      }}
                    >
                      {finding.severity}
                    </span>
                    <span className="text-xs font-mono text-text-muted">{finding.rule_id}</span>
                    <h3 className="text-sm font-semibold text-text-primary">{finding.title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-bg-surface border border-bg-border text-text-secondary">
                      {finding.affected_protocol}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-bg-border p-5 bg-bg-surface/50 space-y-4 text-xs">
                    {/* Description & Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                          Description
                        </p>
                        <p className="text-text-secondary leading-relaxed">{finding.description}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                          Security Impact
                        </p>
                        <p className="text-red/90 leading-relaxed">{finding.security_impact}</p>
                      </div>
                    </div>

                    {/* Forensic Evidence */}
                    <div>
                      <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1">
                        Forensic Evidence & Endpoint
                      </p>
                      <div className="bg-bg-card p-3 rounded-lg border border-bg-border font-mono text-[11px] text-text-secondary space-y-1">
                        <div><b className="text-text-muted">Target:</b> {finding.affected_connection}</div>
                        <div><b className="text-text-muted">Evidence:</b> {finding.evidence}</div>
                      </div>
                    </div>

                    {/* Recommendation & Remediation */}
                    <div className="bg-blue/5 border border-blue/20 p-3.5 rounded-lg space-y-2">
                      <div className="flex items-center gap-2 text-blue font-semibold">
                        <CheckCircle className="w-4 h-4" /> Recommended Remediation Action
                      </div>
                      <p className="text-text-secondary">{finding.recommendation}</p>
                      {finding.technical_remediation && (
                        <p className="text-[11px] text-text-muted font-mono">{finding.technical_remediation}</p>
                      )}
                    </div>

                    {/* References */}
                    {finding.references && finding.references.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-semibold text-text-muted uppercase">RFC Reference:</span>
                        <div className="flex gap-2">
                          {finding.references.map((ref, rIdx) => (
                            <span key={rIdx} className="text-[10px] font-mono text-blue bg-blue/10 px-2 py-0.5 rounded border border-blue/20">
                              {ref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
