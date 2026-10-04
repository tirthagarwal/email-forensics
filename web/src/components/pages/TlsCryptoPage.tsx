'use client'
import React from 'react'
import { ForensicReport } from '@/types/report'
import { Lock, Key, ShieldCheck, FileCheck, Layers, Cpu, ShieldAlert, CheckCircle2, AlertTriangle, Info } from 'lucide-react'

interface TlsCryptoPageProps {
  report: ForensicReport
}

export default function TlsCryptoPage({ report }: TlsCryptoPageProps) {
  const {
    tls_sessions = [],
    certificates = [],
    cryptographic_features = [],
    enterprise_posture,
    report_metadata,
  } = report

  // Distributions
  const tlsVersions = enterprise_posture?.tls_version_distribution || {}
  const cipherSuites = enterprise_posture?.cipher_suite_distribution || {}

  // PFS stats
  const totalTls = tls_sessions.length
  const pfsCount = cryptographic_features.filter((cf) => cf.forward_secrecy_indicator).length
  const pfsPct = totalTls > 0 ? Math.round((pfsCount / totalTls) * 100) : 0

  // Cert stats
  const totalCerts = certificates.length
  const selfSignedCount = cryptographic_features.filter((cf) => cf.certificate_self_signed).length
  const weakKeyCount = cryptographic_features.filter((cf) => cf.weak_key_size).length
  const expiredCount = cryptographic_features.filter((cf) => cf.certificate_expired).length

  // TLS 1.3 keylog visibility status
  const keylogSupplied = report_metadata?.tls_keylog_supplied || false
  const keylogStatus = report_metadata?.tls_keylog_decryption_status || 'NOT_APPLICABLE'

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Lock className="w-5 h-5 text-cyber" /> TLS & Cryptographic Architecture
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Deep-packet passive cryptographic posture analysis across transport security layers, cipher suites, and X.509 certificates.
        </p>
      </div>

      {/* Top Crypto Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue/10 border border-blue/20 flex items-center justify-center text-blue flex-shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Active TLS</span>
            <p className="text-lg font-bold text-text-primary">{totalTls} Sessions</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green/10 border border-green/20 flex items-center justify-center text-green flex-shrink-0">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">PFS Adoption</span>
            <p className="text-lg font-bold text-green">{pfsPct}% ({pfsCount}/{totalTls})</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple/10 border border-purple/20 flex items-center justify-center text-purple flex-shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Certificates</span>
            <p className="text-lg font-bold text-text-primary">{totalCerts} Observed</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber/10 border border-amber/20 flex items-center justify-center text-amber flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Self-Signed</span>
            <p className="text-lg font-bold text-amber">{selfSignedCount} Certs</p>
          </div>
        </div>
      </div>

      {/* TLS 1.3 Keylog & Protocol Visibility Status */}
      <div className="card border-blue/30 bg-bg-surface/80 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue/20 flex items-center justify-center text-blue flex-shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-text-primary">TLS 1.3 & Encrypted Handshake Handling</h4>
            <p className="text-[11px] text-text-muted">
              Distinguishes passively observed cleartext handshakes (TLS 1.2) vs encrypted handshake extensions (TLS 1.3)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-muted">Keylog Status:</span>
          <span className="text-xs px-2.5 py-1 rounded font-mono bg-bg-card border border-bg-border text-text-secondary">
            {keylogSupplied ? `DECRYPTED (${keylogStatus})` : `PASSIVE SENSOR (${keylogStatus})`}
          </span>
        </div>
      </div>

      {/* Protocol Version & Cipher Suite Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TLS Versions */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue" /> TLS Protocol Versions
            </h3>
            <span className="text-[10px] text-text-muted font-mono">{Object.keys(tlsVersions).length} distinct version(s)</span>
          </div>
          <div className="space-y-3">
            {Object.keys(tlsVersions).length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No TLS versions observed.</p>
            ) : (
              Object.entries(tlsVersions).map(([ver, count]) => {
                const pct = totalTls > 0 ? Math.round((count / totalTls) * 100) : 0
                return (
                  <div key={ver} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-text-primary font-semibold">{ver}</span>
                      <span className="text-text-muted">{count} session(s) ({pct}%)</span>
                    </div>
                    <div className="w-full bg-bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-blue rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Cipher Suites */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple" /> Negotiated Cipher Suites
            </h3>
            <span className="text-[10px] text-text-muted font-mono">{Object.keys(cipherSuites).length} suite(s)</span>
          </div>
          <div className="space-y-3">
            {Object.keys(cipherSuites).length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">No cipher suites observed.</p>
            ) : (
              Object.entries(cipherSuites).map(([cipher, count]) => {
                const pct = totalTls > 0 ? Math.round((count / totalTls) * 100) : 0
                const isStrong = cipher.includes('GCM') || cipher.includes('CHACHA20')
                return (
                  <div key={cipher} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-mono text-[11px] text-text-primary truncate max-w-[280px]" title={cipher}>
                        {cipher}
                      </span>
                      <span className={isStrong ? 'text-green font-mono text-[11px]' : 'text-amber font-mono text-[11px]'}>
                        {count} session(s)
                      </span>
                    </div>
                    <div className="w-full bg-bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isStrong ? 'bg-green' : 'bg-amber'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* X.509 Certificate Evidence Cards */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between border-b border-bg-border pb-3">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyber" /> X.509 Public Key Certificates
          </h3>
          <span className="text-[10px] text-text-muted font-mono">{certificates.length} certificate(s)</span>
        </div>

        {certificates.length === 0 ? (
          <p className="text-xs text-text-muted py-6 text-center">No X.509 certificates extracted from captured sessions.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map((cert, idx) => (
              <div key={idx} className="bg-bg-surface p-4 rounded-xl border border-bg-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold font-mono text-blue">Cert #{idx + 1}</span>
                  <span className="text-[10px] font-mono text-text-muted">Serial: {cert.serial || 'N/A'}</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-semibold">Subject:</span>
                    <p className="font-mono text-[11px] text-text-primary break-all bg-bg-card p-2 rounded border border-bg-border mt-0.5">
                      {cert.subject || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-semibold">Issuer:</span>
                    <p className="font-mono text-[11px] text-text-secondary break-all bg-bg-card p-2 rounded border border-bg-border mt-0.5">
                      {cert.issuer || 'N/A'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div>
                      <span className="text-[10px] text-text-muted">Key Algorithm:</span>
                      <p className="font-mono text-text-primary font-semibold">{cert.key_algorithm || 'RSA'} ({cert.key_length || 2048} bits)</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted">Signature Algorithm:</span>
                      <p className="font-mono text-text-primary font-semibold">{cert.signature_algorithm || 'sha256WithRSAEncryption'}</p>
                    </div>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] text-text-muted">SHA-256 Fingerprint:</span>
                    <p className="font-mono text-[10px] text-text-muted break-all">{cert.fingerprint_sha256}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
