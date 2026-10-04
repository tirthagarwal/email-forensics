'use client'
import React, { useState } from 'react'
import { ForensicReport, EmailSession, CryptoFeature, Connection } from '@/types/report'
import { formatBytes, formatDuration } from '@/lib/utils'
import { Network, Search, Filter, ArrowUpDown, ChevronRight, ShieldCheck, ShieldAlert } from 'lucide-react'

interface SessionsPageProps {
  report: ForensicReport
}

export default function SessionsPage({ report }: SessionsPageProps) {
  const { email_sessions = [], cryptographic_features = [], connections = [] } = report
  const [search, setSearch] = useState('')
  const [protocolFilter, setProtocolFilter] = useState('ALL')
  const [tlsFilter, setTlsFilter] = useState('ALL')
  const [selectedSession, setSelectedSession] = useState<EmailSession | null>(
    email_sessions.length > 0 ? email_sessions[0] : null
  )

  // Map crypto features and connections by UID for lookup
  const cryptoMap = new Map<string, CryptoFeature>()
  cryptographic_features.forEach((cf) => cryptoMap.set(cf.uid, cf))

  const connMap = new Map<string, Connection>()
  connections.forEach((c) => connMap.set(c.uid, c))

  // Filter sessions
  const filteredSessions = email_sessions.filter((s) => {
    const conn = connMap.get(s.uid)
    const crypto = cryptoMap.get(s.uid)
    const matchesSearch =
      search === '' ||
      s.uid.toLowerCase().includes(search.toLowerCase()) ||
      s.protocol.toLowerCase().includes(search.toLowerCase()) ||
      (conn?.source && conn.source.toLowerCase().includes(search.toLowerCase())) ||
      (conn?.destination && conn.destination.toLowerCase().includes(search.toLowerCase())) ||
      (crypto?.cipher_suite && crypto.cipher_suite.toLowerCase().includes(search.toLowerCase()))

    const matchesProtocol = protocolFilter === 'ALL' || s.protocol === protocolFilter
    const matchesTls =
      tlsFilter === 'ALL' ||
      (tlsFilter === 'TLS' && s.tls_established) ||
      (tlsFilter === 'CLEARTEXT' && !s.tls_established)

    return matchesSearch && matchesProtocol && matchesTls
  })

  const selectedCrypto = selectedSession ? cryptoMap.get(selectedSession.uid) : null
  const selectedConn = selectedSession ? connMap.get(selectedSession.uid) : null

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Network className="w-5 h-5 text-blue" /> Reconstructed Email Sessions
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Inspection of email flows, TLS negotiation state, encryption handshakes, and volume telemetry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md bg-bg-card border border-bg-border text-text-secondary">
            Total Sessions: <b className="text-text-primary">{email_sessions.length}</b>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search UID, IP, protocol, cipher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-bg-surface border border-bg-border rounded-lg text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue"
          />
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Security:
          </span>
          <div className="flex gap-1">
            {['ALL', 'TLS', 'CLEARTEXT'].map((t) => (
              <button
                key={t}
                onClick={() => setTlsFilter(t)}
                className={`text-xs px-2.5 py-1 rounded border transition-all ${
                  tlsFilter === t
                    ? 'bg-blue/15 border-blue/40 text-blue font-semibold'
                    : 'bg-bg-surface border-bg-border text-text-muted hover:text-text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Sessions List & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sessions Table */}
        <div className="lg:col-span-7 card overflow-hidden p-0 flex flex-col">
          <div className="p-4 border-b border-bg-border flex items-center justify-between">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Sessions ({filteredSessions.length})
            </span>
          </div>
          <div className="overflow-x-auto flex-1 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-surface text-text-muted sticky top-0 z-10">
                <tr>
                  <th className="p-3">Protocol</th>
                  <th className="p-3">Endpoints</th>
                  <th className="p-3">Security</th>
                  <th className="p-3">TLS Ver</th>
                  <th className="p-3">Volume</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bg-border/40">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-muted">
                      No matching sessions found.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((session) => {
                    const conn = connMap.get(session.uid)
                    const isSelected = selectedSession?.uid === session.uid
                    return (
                      <tr
                        key={session.uid}
                        onClick={() => setSelectedSession(session)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue/10' : 'hover:bg-bg-muted/40'
                        }`}
                      >
                        <td className="p-3 font-semibold text-text-primary">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-bg-muted border border-bg-border">
                            {session.protocol}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-text-secondary">
                          <div>{conn?.source || '192.168.1.50'}</div>
                          <div className="text-[10px] text-text-muted">→ {conn?.destination || '192.168.1.20'}</div>
                        </td>
                        <td className="p-3">
                          {session.tls_established ? (
                            <span className="badge-pass inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> TLS
                            </span>
                          ) : (
                            <span className="badge-fail inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> Cleartext
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {session.tls_version || <span className="text-text-muted">—</span>}
                        </td>
                        <td className="p-3 text-[11px] text-text-muted font-mono">
                          {formatBytes((conn?.client_bytes || 0) + (conn?.server_bytes || 0))}
                        </td>
                        <td className="p-3 text-right">
                          <ChevronRight
                            className={`w-4 h-4 ml-auto transition-transform ${
                              isSelected ? 'text-blue translate-x-1' : 'text-text-muted'
                            }`}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Inspector Drawer / Card */}
        <div className="lg:col-span-5 space-y-4">
          {selectedSession ? (
            <div className="card space-y-5">
              <div className="flex items-center justify-between border-b border-bg-border pb-3">
                <div>
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                    Session Inspection
                  </span>
                  <h3 className="text-sm font-mono font-bold text-text-primary">{selectedSession.uid}</h3>
                </div>
                <span
                  className={
                    selectedSession.tls_established
                      ? 'badge-pass text-xs'
                      : 'badge-fail text-xs'
                  }
                >
                  {selectedSession.encryption_mode || (selectedSession.tls_established ? 'ENCRYPTED_TLS' : 'CLEARTEXT')}
                </span>
              </div>

              {/* Endpoint & Network Flow */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Network Flow</p>
                <div className="bg-bg-surface p-3 rounded-lg border border-bg-border grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-text-muted text-[10px]">Source</span>
                    <p className="font-mono text-text-primary">{selectedConn?.source || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px]">Destination</span>
                    <p className="font-mono text-text-primary">{selectedConn?.destination || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px]">Duration</span>
                    <p className="font-mono text-text-secondary">{formatDuration(selectedConn?.duration_seconds || selectedCrypto?._duration || 0)}</p>
                  </div>
                  <div>
                    <span className="text-text-muted text-[10px]">Flow Volume</span>
                    <p className="font-mono text-text-secondary">
                      TX: {formatBytes(selectedConn?.client_bytes || selectedCrypto?._client_bytes || 0)} / RX: {formatBytes(selectedConn?.server_bytes || selectedCrypto?._server_bytes || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cryptographic Parameters */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Cryptographic Parameters
                </p>
                <div className="bg-bg-surface p-3 rounded-lg border border-bg-border space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
                    <span className="text-text-muted">TLS Version:</span>
                    <span className="font-mono text-text-primary font-semibold">
                      {selectedCrypto?.tls_version || selectedSession.tls_version || 'NOT OBSERVED'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
                    <span className="text-text-muted">Cipher Suite:</span>
                    <span className="font-mono text-text-primary text-[11px] truncate max-w-[200px]" title={selectedCrypto?.cipher_suite || selectedSession.cipher_suite || 'NONE'}>
                      {selectedCrypto?.cipher_suite || selectedSession.cipher_suite || 'NONE'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
                    <span className="text-text-muted">Key Exchange (PFS):</span>
                    <span className="font-mono text-text-primary">
                      {selectedCrypto?.forward_secrecy_indicator ? '✓ ECDHE/DHE (Active)' : '✗ None (Static RSA)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
                    <span className="text-text-muted">Elliptic Curve:</span>
                    <span className="font-mono text-text-primary">{selectedCrypto?.elliptic_curve || 'NONE'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-text-muted">SNI Target:</span>
                    <span className="font-mono text-text-primary">{selectedCrypto?.server_name || 'NOT OBSERVED'}</span>
                  </div>
                </div>
              </div>

              {/* X.509 Certificate Evidence */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Certificate Evidence
                </p>
                <div className="bg-bg-surface p-3 rounded-lg border border-bg-border space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Visibility Status:</span>
                    <span className="font-semibold text-blue">{selectedCrypto?.certificate_visibility_status || 'NOT OBSERVED'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Self-Signed:</span>
                    <span className={selectedCrypto?.certificate_self_signed ? 'text-amber font-semibold' : 'text-green'}>
                      {selectedCrypto?.certificate_self_signed ? '⚠ YES (Self-Signed)' : '✓ NO (CA Signed)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Public Key Size:</span>
                    <span className="font-mono text-text-primary">
                      {selectedCrypto?.certificate_key_size ? `${selectedCrypto.certificate_key_size}-bit RSA` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistical ML Anomaly Score */}
              <div>
                <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">
                  AI Statistical Deviation
                </p>
                <div className="bg-bg-surface p-3 rounded-lg border border-bg-border flex items-center justify-between text-xs">
                  <span className="text-text-muted">ML Anomaly Score:</span>
                  <span className="font-mono font-bold text-purple">
                    {selectedSession.ml_anomaly_score != null ? selectedSession.ml_anomaly_score.toFixed(4) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-8 text-center text-text-muted">
              Select a session from the table to inspect details.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
