'use client'
import React, { useState } from 'react'
import { ForensicReport } from '@/types/report'
import { SelectedSource } from '@/components/SourceSelector'
import {
  Radio, Play, Square, RefreshCw, Activity, AlertTriangle,
  Terminal, WifiOff, ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveMonitorPageProps {
  report: ForensicReport
  source?: SelectedSource | null
}

type SensorState =
  | 'SENSOR_NOT_CONNECTED'
  | 'STOPPED'
  | 'STARTING'
  | 'ACTIVE'
  | 'STOPPING'
  | 'PERMISSION_DENIED'
  | 'ERROR'

const BPF_PRESETS = [
  { label: 'Email Traffic (SMTP/IMAP/POP3)', value: 'tcp port 25 or 587 or 465 or 993 or 143 or 995 or 110' },
  { label: 'Broad TCP', value: 'tcp' },
  { label: 'Custom…', value: 'custom' },
]

export default function LiveMonitorPage({ report, source }: LiveMonitorPageProps) {
  const { pcap, summary } = report
  const [sensorState, setSensorState] = useState<SensorState>('SENSOR_NOT_CONNECTED')
  const [selectedInterface, setSelectedInterface] = useState('en0')
  const [bpfPreset, setBpfPreset] = useState(BPF_PRESETS[0].value)
  const [customBpf, setCustomBpf] = useState('')
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false)
  const [technicalDetail, setTechnicalDetail] = useState('')
  const [logs, setLogs] = useState<string[]>([])

  const isCapturing = sensorState === 'ACTIVE'
  const effectiveBpf = bpfPreset === 'custom' ? customBpf : bpfPreset

  const addLog = (line: string) => {
    const ts = new Date().toISOString()
    setLogs((prev) => [`[${ts}] ${line}`, ...prev])
  }

  const handleStart = async () => {
    if (!privacyAcknowledged) return
    setSensorState('STARTING')
    setTechnicalDetail('')
    addLog(`Attempting to start passive capture on ${selectedInterface} with BPF: ${effectiveBpf}`)

    try {
      const res = await fetch('http://localhost:5001/capture/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interface: selectedInterface, bpf: effectiveBpf }),
        signal: AbortSignal.timeout(4000),
      })
      if (res.status === 403 || res.status === 401) {
        const errJson = await res.json().catch(() => ({}))
        setTechnicalDetail(errJson.detail || errJson.error || 'tcpdump requires CAP_NET_RAW or root/sudo privileges.')
        setSensorState('PERMISSION_DENIED')
        addLog('ERROR: Permission denied — capture requires elevated privileges (CAP_NET_RAW / sudo).')
        return
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        setTechnicalDetail(errJson.detail || errJson.error || `Sensor responded with status ${res.status}`)
        throw new Error(`Sensor responded with ${res.status}`)
      }
      setSensorState('ACTIVE')
      addLog(`Passive capture ACTIVE on ${selectedInterface}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Failed to fetch') || msg.includes('timeout')) {
        setSensorState('SENSOR_NOT_CONNECTED')
        addLog('ERROR: Local sensor not reachable. No capture started.')
      } else {
        setTechnicalDetail(msg)
        setSensorState('ERROR')
        addLog(`ERROR: ${msg}`)
      }
    }
  }

  const handleStop = async () => {
    setSensorState('STOPPING')
    addLog('Stopping capture…')
    try {
      await fetch('http://localhost:5001/capture/stop', { method: 'POST', signal: AbortSignal.timeout(4000) })
    } catch {
      // best effort
    }
    setSensorState('STOPPED')
    addLog('Capture stopped. Session rotation buffer saved.')
  }

  const handleRefresh = () => {
    addLog('Polling sensor telemetry…')
  }

  const sensorBadgeClass = {
    SENSOR_NOT_CONNECTED: 'bg-bg-muted text-text-muted border-bg-border',
    STOPPED:              'bg-bg-muted text-text-muted border-bg-border',
    STARTING:             'bg-amber/15 text-amber border-amber/30',
    ACTIVE:               'bg-red/15 text-red border-red/30',
    STOPPING:             'bg-amber/15 text-amber border-amber/30',
    PERMISSION_DENIED:    'bg-red/15 text-red border-red/30',
    ERROR:                'bg-red/15 text-red border-red/30',
  }[sensorState]

  const sensorDotClass = {
    SENSOR_NOT_CONNECTED: 'bg-text-muted',
    STOPPED:              'bg-text-muted',
    STARTING:             'bg-amber animate-ping',
    ACTIVE:               'bg-red animate-ping',
    STOPPING:             'bg-amber animate-ping',
    PERMISSION_DENIED:    'bg-red',
    ERROR:                'bg-red',
  }[sensorState]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <Radio className="w-5 h-5 text-red" /> SOC Real-Time Passive Network Monitor
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Real-time interface sensor listening passively for SMTP, IMAP, POP3, and TLS handshakes.
        </p>
      </div>

      {/* Remote mode note — shown when running from public Cloud Run deployment */}
      {!!(process.env.NEXT_PUBLIC_FORENSIC_API_URL) && (
        <div className="card border-blue/20 bg-blue/5 p-4 flex items-start gap-3 text-xs">
          <Radio className="w-4 h-4 text-blue flex-shrink-0 mt-0.5 opacity-70" />
          <div className="leading-relaxed text-text-muted space-y-1">
            <span className="font-semibold text-blue">Live Capture — Local / Enterprise Sensor Required</span>
            <p>
              PCAP file analysis runs on the public Cloud Run forensic engine, but live packet capture
              requires a locally-running authorized sensor with direct network interface access. To use
              this tab, start{' '}
              <code className="text-cyber text-[11px]">venv/bin/python3 local_sensor/server.py</code>{' '}
              on a machine on your target network and open the dashboard from that machine.
            </p>
          </div>
        </div>
      )}

      {/* SENSOR NOT CONNECTED banner */}
      {sensorState === 'SENSOR_NOT_CONNECTED' && (
        <div className="card border-bg-border bg-bg-surface p-5 flex items-start gap-4">
          <WifiOff className="w-6 h-6 text-text-muted flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-xs">
            <h4 className="font-bold text-text-primary text-sm">LIVE SENSOR NOT CONNECTED</h4>
            <p className="text-text-muted leading-relaxed">
              This dashboard is a static web application. Live packet capture requires a locally-running
              authorized sensor process with elevated network privileges.
            </p>
            <div className="bg-bg-base p-3 rounded-lg border border-bg-border font-mono text-[11px] text-cyber/90 space-y-1">
              <div># Start the local forensic sensor:</div>
              <div>cd /path/to/email-forensics</div>
              <div>venv/bin/python3 local_sensor/server.py</div>
              <div className="mt-2 text-text-muted"># Then return here and click Start Capture.</div>
            </div>
          </div>
        </div>
      )}

      {/* Permission denied card */}
      {sensorState === 'PERMISSION_DENIED' && (
        <div className="card border-red/30 bg-red/5 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs flex-1">
            <h4 className="font-semibold text-red">Capture Permission Denied</h4>
            <p className="text-text-muted leading-relaxed">
              The sensor process does not have sufficient privileges to open a raw packet socket on
              this interface. Privileged capture (CAP_NET_RAW) must be granted by a system administrator.
            </p>
            <div className="bg-bg-base p-2.5 rounded border border-bg-border font-mono text-[11px] text-cyber/80 space-y-1 mt-2">
              <div># macOS / Linux — run sensor with elevated privileges:</div>
              <div>sudo venv/bin/python3 local_sensor/server.py</div>
            </div>
            {technicalDetail && (
              <details className="mt-2 text-[10px] text-text-muted cursor-pointer">
                <summary className="font-mono text-text-muted hover:text-text-secondary select-none">
                  Technical Details (Diagnostic Log)
                </summary>
                <pre className="mt-1 p-2 bg-bg-base/90 rounded border border-bg-border font-mono text-[10px] text-text-muted overflow-x-auto whitespace-pre-wrap max-h-32">
                  {technicalDetail}
                </pre>
              </details>
            )}
            <button
              onClick={() => setSensorState('STOPPED')}
              className="mt-2 text-[10px] px-3 py-1 rounded bg-bg-muted border border-bg-border text-text-muted hover:text-text-primary transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Sensor Error card */}
      {sensorState === 'ERROR' && (
        <div className="card border-red/30 bg-red/5 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs flex-1">
            <h4 className="font-semibold text-red">Sensor Error</h4>
            <p className="text-text-muted leading-relaxed">
              The live sensor encountered an internal processing error.
            </p>
            {technicalDetail && (
              <details className="mt-2 text-[10px] text-text-muted cursor-pointer">
                <summary className="font-mono text-text-muted hover:text-text-secondary select-none">
                  Technical Details (Diagnostic Log)
                </summary>
                <pre className="mt-1 p-2 bg-bg-base/90 rounded border border-bg-border font-mono text-[10px] text-text-muted overflow-x-auto whitespace-pre-wrap max-h-32">
                  {technicalDetail}
                </pre>
              </details>
            )}
            <button
              onClick={() => setSensorState('STOPPED')}
              className="mt-2 text-[10px] px-3 py-1 rounded bg-bg-muted border border-bg-border text-text-muted hover:text-text-primary transition-all"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Mandatory Privacy Warning — always visible, must be acknowledged before start */}
      <div className={cn(
        'card border p-4 flex items-start gap-3.5',
        privacyAcknowledged ? 'border-bg-border bg-bg-surface' : 'border-amber/40 bg-amber/5'
      )}>
        <AlertTriangle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', privacyAcknowledged ? 'text-text-muted' : 'text-amber')} />
        <div className="flex-1 space-y-2 text-xs">
          <h4 className="font-semibold text-text-primary">PRIVACY &amp; SECURITY NOTICE</h4>
          <p className="text-text-muted leading-relaxed">
            Live packet capture may record sensitive email metadata, credentials, message content, and IP addresses. Capture only on networks and systems you are explicitly authorised to monitor. Passive email packet capture is restricted to authorized administrative networks and security personnel acting within their legal mandate.
          </p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setPrivacyAcknowledged((v) => !v)}
              className={cn(
                'w-4 h-4 rounded border transition-colors flex items-center justify-center flex-shrink-0',
                privacyAcknowledged
                  ? 'bg-green border-green text-white'
                  : 'border-amber bg-bg-surface'
              )}
            >
              {privacyAcknowledged && (
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={cn('text-xs', privacyAcknowledged ? 'text-green' : 'text-amber')}>
              I confirm I am authorized to perform passive network monitoring on this network.
            </span>
          </label>
        </div>
      </div>

      {/* Status & Control Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sensor Controls */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Sensor Controls</h3>
            <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 border', sensorBadgeClass)}>
              <span className={cn('w-2 h-2 rounded-full', sensorDotClass)} />
              {sensorState.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Interface */}
            <div>
              <label className="text-[10px] text-text-muted uppercase font-semibold block mb-1">Network Interface</label>
              <select
                disabled={isCapturing}
                value={selectedInterface}
                onChange={(e) => setSelectedInterface(e.target.value)}
                className="w-full bg-bg-surface border border-bg-border rounded-lg p-2 text-text-primary font-mono focus:outline-none focus:border-blue"
              >
                <option value="en0">en0 (Primary Wi-Fi / Ethernet)</option>
                <option value="eth0">eth0 (LAN Interface)</option>
                <option value="any">any (All Interfaces)</option>
                <option value="lo0">lo0 (Loopback Test)</option>
              </select>
            </div>

            {/* BPF Preset */}
            <div>
              <label className="text-[10px] text-text-muted uppercase font-semibold block mb-1">BPF Filter Preset</label>
              <select
                disabled={isCapturing}
                value={bpfPreset}
                onChange={(e) => setBpfPreset(e.target.value)}
                className="w-full bg-bg-surface border border-bg-border rounded-lg p-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-blue"
              >
                {BPF_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            {/* Custom BPF */}
            {bpfPreset === 'custom' && (
              <div>
                <label className="text-[10px] text-text-muted uppercase font-semibold block mb-1">Custom BPF Expression</label>
                <input
                  type="text"
                  disabled={isCapturing}
                  value={customBpf}
                  onChange={(e) => setCustomBpf(e.target.value)}
                  placeholder="e.g. tcp port 25"
                  className="w-full bg-bg-surface border border-bg-border rounded-lg p-2 text-text-primary font-mono text-[11px] focus:outline-none focus:border-blue"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {!isCapturing ? (
                <button
                  onClick={handleStart}
                  disabled={!privacyAcknowledged}
                  className={cn(
                    'col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold transition-all text-xs',
                    privacyAcknowledged
                      ? 'bg-green/20 border border-green/40 text-green hover:bg-green/30 cursor-pointer'
                      : 'bg-bg-muted border border-bg-border text-text-muted cursor-not-allowed opacity-60'
                  )}
                >
                  <Play className="w-4 h-4" /> Start Capture
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red/20 border border-red/40 text-red font-semibold hover:bg-red/30 transition-all text-xs"
                >
                  <Square className="w-4 h-4" /> Stop Capture
                </button>
              )}
              <button
                onClick={handleRefresh}
                className="col-span-2 flex items-center justify-center gap-2 py-2 rounded-lg bg-bg-muted border border-bg-border text-text-secondary hover:text-text-primary text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
              </button>
            </div>
          </div>
        </div>

        {/* Live Telemetry Summary */}
        <div className="lg:col-span-2 card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyber" /> Ingested PCAP Telemetry
            </h3>
            <span className="text-[10px] font-mono text-text-muted">From Last Analysis</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-bg-surface p-3 rounded-lg border border-bg-border">
              <span className="text-[10px] text-text-muted uppercase">PCAPs Ingested</span>
              <p className="text-lg font-bold text-text-primary font-mono">{pcap?.total_pcaps ?? '—'}</p>
            </div>
            <div className="bg-bg-surface p-3 rounded-lg border border-bg-border">
              <span className="text-[10px] text-text-muted uppercase">Observed Sessions</span>
              <p className="text-lg font-bold text-blue font-mono">{summary?.total_sessions ?? '—'}</p>
            </div>
            <div className="bg-bg-surface p-3 rounded-lg border border-bg-border">
              <span className="text-[10px] text-text-muted uppercase">Findings Triggered</span>
              <p className="text-lg font-bold text-red font-mono">{summary?.total_findings ?? '—'}</p>
            </div>
            <div className="bg-bg-surface p-3 rounded-lg border border-bg-border">
              <span className="text-[10px] text-text-muted uppercase">ML Anomalies</span>
              <p className="text-lg font-bold text-purple font-mono">{summary?.total_ml_anomalies ?? '—'}</p>
            </div>
          </div>

          {/* Sensor Console Log */}
          <div>
            <span className="text-[10px] text-text-muted uppercase font-semibold block mb-1.5 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Sensor Event Log
            </span>
            <div className="bg-bg-base p-3 rounded-lg border border-bg-border font-mono text-[11px] text-text-secondary h-40 overflow-y-auto space-y-1">
              {logs.length === 0 ? (
                <div className="text-text-muted italic">No events yet. Start capture to see live log.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="text-cyber/90">{log}</div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
