'use client'
import React from 'react'
import { ForensicReport } from '@/types/report'
import { Building2, Server, Shield, Lock, AlertTriangle, TrendingUp, Layers, CheckCircle2 } from 'lucide-react'

interface EnterprisePosturePageProps {
  report: ForensicReport
}

export default function EnterprisePosturePage({ report }: EnterprisePosturePageProps) {
  const { enterprise_posture, summary, cryptographic_features = [] } = report

  const enterpriseScore = enterprise_posture?.enterprise_risk_score ?? summary.overall_risk_score ?? 0
  const enterpriseLevel = enterprise_posture?.enterprise_risk_level ?? summary.risk_level ?? 'LOW'
  const topSystems = enterprise_posture?.top_affected_systems || []
  const weaknesses = enterprise_posture?.recurring_weaknesses || []

  // Metrics
  const totalSessions = summary.total_sessions || 1
  const tlsSessions = cryptographic_features.filter((cf) => cf.tls_established).length
  const tlsAdoption = Math.round((tlsSessions / totalSessions) * 100)
  const pfsSessions = cryptographic_features.filter((cf) => cf.forward_secrecy_indicator).length
  const pfsAdoption = tlsSessions > 0 ? Math.round((pfsSessions / tlsSessions) * 100) : 0
  const selfSignedCerts = cryptographic_features.filter((cf) => cf.certificate_self_signed).length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue" /> Executive Enterprise Security Posture
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Aggregated cryptographic health, server fleet exposure, compliance status, and recurring systemic risks.
        </p>
      </div>

      {/* Top Posture Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border-blue/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Enterprise Risk</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-text-primary">{enterpriseScore.toFixed(1)}</span>
            <span className="text-xs text-text-muted">/ 100</span>
            <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-green/10 text-green border border-green/30">
              {enterpriseLevel}
            </span>
          </div>
        </div>

        <div className="card border-green/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Fleet TLS Adoption</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-green">{tlsAdoption}%</span>
            <span className="text-xs text-text-muted">({tlsSessions}/{totalSessions} sessions)</span>
          </div>
        </div>

        <div className="card border-cyber/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Forward Secrecy (PFS)</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-cyber">{pfsAdoption}%</span>
            <span className="text-xs text-text-muted">of TLS sessions</span>
          </div>
        </div>

        <div className="card border-amber/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Self-Signed Certs</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-amber">{selfSignedCerts}</span>
            <span className="text-xs text-text-muted">requiring CA replacement</span>
          </div>
        </div>
      </div>

      {/* Top Affected Servers & Recurring Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Affected Systems */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-blue" /> Priority Affected Servers
            </h3>
            <span className="text-[10px] text-text-muted">By Finding Density</span>
          </div>
          <div className="space-y-2.5">
            {topSystems.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No server-specific findings identified.</p>
            ) : (
              topSystems.map((sys, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-bg-surface border border-bg-border">
                  <div className="flex items-center gap-2.5">
                    <Server className="w-4 h-4 text-text-muted" />
                    <span className="font-mono text-xs text-text-primary font-semibold">{sys.server}</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded font-mono bg-red/10 text-red border border-red/20">
                    {sys.finding_count} Finding(s)
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recurring Systemic Weaknesses */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber" /> Recurring Organizational Patterns
            </h3>
            <span className="text-[10px] text-text-muted">Policy Audits</span>
          </div>
          <div className="space-y-2.5">
            {weaknesses.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No recurring weaknesses flagged.</p>
            ) : (
              weaknesses.map((w, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-bg-surface border border-bg-border">
                  <span className="w-5 h-5 rounded-full bg-amber/10 text-amber border border-amber/30 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">{w}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Historical Trend Grounding Notice */}
      <div className="card border-bg-border p-6 text-center space-y-2">
        <TrendingUp className="w-8 h-8 text-text-muted mx-auto" />
        <h4 className="text-xs font-semibold text-text-secondary">Historical Longitudinal Trend</h4>
        <p className="text-xs text-text-muted max-w-md mx-auto">
          Historical trend visualization is currently displaying snapshot posture. Ongoing continuous PCAP capture will populate multi-run time-series deltas in the database.
        </p>
      </div>
    </div>
  )
}
