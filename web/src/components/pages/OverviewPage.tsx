'use client'
import React from 'react'
import { ForensicReport } from '@/types/report'
import { getRiskColor, getRiskBg, formatTimestamp } from '@/lib/utils'
import {
  Shield, Network, Lock, AlertTriangle, Brain,
  TrendingUp, CheckCircle2, XCircle, AlertCircle, Eye, Minus
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, Cell
} from 'recharts'

interface OverviewPageProps { report: ForensicReport }

function KpiCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: React.ReactNode; sub?: string
  color: string; icon: React.ElementType
}) {
  return (
    <div className="card flex flex-col gap-3" style={{ borderColor: `${color}20` }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
             style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-text-muted">{sub}</div>}
    </div>
  )
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = {
    CRITICAL: '#f43f5e', HIGH: '#f43f5e',
    MODERATE: '#f59e0b', LOW: '#22d3a6', MINIMAL: '#38bdf8',
  }[level?.toUpperCase()] ?? '#22d3a6'

  const r = 72
  const circ = Math.PI * r
  const offset = circ * (1 - score / 100)

  return (
    <div className="card flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider w-full">Risk Score</p>
      <div className="relative" style={{ width: 180, height: 100 }}>
        <svg width={180} height={100} viewBox="0 0 180 100">
          {/* track */}
          <path d="M 18 90 A 72 72 0 0 1 162 90"
                fill="none" stroke="#1a2840" strokeWidth="12" strokeLinecap="round" />
          {/* filled */}
          <path d="M 18 90 A 72 72 0 0 1 162 90"
                fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
          {/* glow */}
          <path d="M 18 90 A 72 72 0 0 1 162 90"
                fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                strokeDasharray={circ} strokeDashoffset={offset}
                style={{ opacity: 0.3, filter: 'blur(4px)', transition: 'stroke-dashoffset 1.2s ease' }} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-1">
          <span className="text-3xl font-bold" style={{ color }}>
            {score.toFixed(1)}
          </span>
          <span className="text-[10px] text-text-muted">out of 100</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold px-3 py-1 rounded-full border ${getRiskBg(level)}`}>
          {level}
        </span>
      </div>
      <p className="text-[10px] text-text-muted text-center max-w-[180px]">
        Lower score = better posture. Score derived from passive forensic analysis.
      </p>
    </div>
  )
}

function StatusSummary({ controls }: { controls: Array<{ status: string }> }) {
  const counts: Record<string, number> = {}
  for (const c of controls) {
    counts[c.status] = (counts[c.status] ?? 0) + 1
  }
  const items = [
    { label: 'PASS',              color: '#22d3a6', Icon: CheckCircle2 },
    { label: 'WARNING',           color: '#f59e0b', Icon: AlertCircle },
    { label: 'VIOLATION',         color: '#f43f5e', Icon: XCircle },
    { label: 'NOT OBSERVED',      color: '#a78bfa', Icon: Minus },
    { label: 'VISIBILITY LIMITED',color: '#a78bfa', Icon: Eye },
  ]
  return (
    <div className="card">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-4">Security Posture Summary</p>
      <div className="flex flex-col gap-2.5">
        {items.map(({ label, color, Icon }) => {
          const count = counts[label] ?? 0
          const total = controls.length
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={label} className="flex items-center gap-3">
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
              <span className="text-xs text-text-secondary w-32 flex-shrink-0">{label}</span>
              <div className="flex-1 bg-bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${pct}%`, background: color }} />
              </div>
              <span className="text-xs font-mono text-text-muted w-5 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RiskContributors({ contributors }: { contributors: Array<{ title: string; points_added: number }> }) {
  if (!contributors?.length) return null
  const data = contributors.map(c => ({ name: c.title.length > 22 ? c.title.slice(0, 22) + '…' : c.title, pts: c.points_added }))

  return (
    <div className="card flex flex-col justify-between">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Risk Contributors</p>
      <div className="h-40 w-full min-h-[140px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fill: '#4a6480', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#8da4bf', fontSize: 11 }} axisLine={false} tickLine={false} width={150} />
            <Tooltip
              contentStyle={{ background: '#131f30', border: '1px solid #1e3050', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#f0f6ff' }}
              formatter={(v: number) => [`+${v} pts`, 'Risk Impact']}
            />
            <Bar dataKey="pts" radius={[0, 4, 4, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#f43f5e' : i === 1 ? '#f59e0b' : '#a78bfa'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ProtocolBadge({ proto }: { proto: string }) {
  const colors: Record<string, string> = {
    SMTP: '#38bdf8', IMAP: '#22d3a6', POP3: '#a78bfa', UNKNOWN: '#4a6480'
  }
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
          style={{ color: colors[proto] ?? '#8da4bf', borderColor: `${colors[proto] ?? '#4a6480'}40`,
                   background: `${colors[proto] ?? '#4a6480'}12` }}>
      {proto}
    </span>
  )
}

export default function OverviewPage({ report }: OverviewPageProps) {
  const { summary, pcap, security_assessment, email_sessions, tls_sessions,
          report_metadata, enterprise_posture } = report

  const sessionCount  = summary.total_sessions ?? email_sessions?.length ?? 0
  const tlsCount      = tls_sessions?.length ?? 0
  const findingCount  = summary.total_findings ?? 0
  const mlAnomCount   = summary.total_ml_anomalies ?? 0
  const riskScore     = summary.overall_risk_score ?? 0
  const riskLevel     = summary.risk_level ?? 'UNKNOWN'
  const analyzed      = pcap?.analyzed_at ?? report_metadata?.generated_at ?? ''
  const allControls   = [
    ...(security_assessment?.controls ?? []),
    ...(security_assessment?.violations ?? [])
  ]
  const contributors  = security_assessment?.risk_contributors ?? []
  const protocols     = Object.keys(enterprise_posture?.protocol_breakdown ?? {})

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary">Overview</h2>
        <p className="text-xs text-text-muted mt-1">
          {pcap?.total_pcaps ?? 0} PCAP{(pcap?.total_pcaps ?? 0) !== 1 ? 's' : ''} analyzed ·{' '}
          {analyzed ? formatTimestamp(analyzed) : 'N/A'}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Risk Score" value={<>{riskScore.toFixed(1)}<span className="text-sm text-text-muted">/100</span></>}
                 sub={riskLevel} color="#f59e0b" icon={Shield} />
        <KpiCard label="Risk Level" value={riskLevel}
                 color={{ CRITICAL: '#f43f5e', HIGH: '#f43f5e', MODERATE: '#f59e0b', LOW: '#22d3a6', MINIMAL: '#38bdf8' }[riskLevel] ?? '#8da4bf'}
                 icon={TrendingUp} />
        <KpiCard label="Sessions"   value={sessionCount}
                 sub="email sessions" color="#38bdf8" icon={Network} />
        <KpiCard label="TLS"        value={tlsCount}
                 sub="TLS sessions" color="#06d6e0" icon={Lock} />
        <KpiCard label="Findings"   value={findingCount}
                 sub="deterministic" color="#f43f5e" icon={AlertTriangle} />
        <KpiCard label="ML Anomalies" value={mlAnomCount}
                 sub="statistical" color="#a78bfa" icon={Brain} />
      </div>

      {/* Middle row: gauge + contributors + summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RiskGauge score={riskScore} level={riskLevel} />
        <RiskContributors contributors={contributors} />
        <StatusSummary controls={allControls} />
      </div>

      {/* Sessions quick table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Email Sessions</p>
          <span className="text-[10px] text-text-muted">{sessionCount} session{sessionCount !== 1 ? 's' : ''}</span>
        </div>
        {email_sessions?.length ? (
          <table className="w-full">
            <thead>
              <tr>
                <th>Protocol</th>
                <th>Encryption</th>
                <th>TLS Version</th>
                <th>STARTTLS</th>
                <th>ML Score</th>
              </tr>
            </thead>
            <tbody>
              {email_sessions.map((s, i) => (
                <tr key={i}>
                  <td><ProtocolBadge proto={s.protocol} /></td>
                  <td>
                    <span className={s.tls_established ? 'text-green text-xs' : 'text-red text-xs'}>
                      {s.encryption_mode?.replace(/_/g, ' ') ?? (s.tls_established ? 'TLS' : 'CLEARTEXT')}
                    </span>
                  </td>
                  <td className="mono text-[11px]">{s.tls_version ?? '—'}</td>
                  <td>
                    <span className={s.starttls_accepted ? 'text-green text-xs' : 'text-text-muted text-xs'}>
                      {s.starttls_accepted ? '✓ Yes' : '—'}
                    </span>
                  </td>
                  <td>
                    {s.ml_anomaly_score != null ? (
                      <span className={s.ml_anomaly_score > 0.5 ? 'text-amber text-xs mono' : 'text-text-muted text-xs mono'}>
                        {s.ml_anomaly_score.toFixed(4)}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-text-muted text-center py-6">No sessions found in report.</p>
        )}
      </div>

      {/* Protocol breakdown */}
      {protocols.length > 0 && (
        <div className="card">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">Protocol Distribution</p>
          <div className="flex flex-wrap gap-3">
            {protocols.map(p => (
              <div key={p} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-muted border border-bg-border">
                <ProtocolBadge proto={p} />
                <span className="text-sm font-semibold text-text-primary">
                  {enterprise_posture.protocol_breakdown[p]}
                </span>
                <span className="text-xs text-text-muted">sessions</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
