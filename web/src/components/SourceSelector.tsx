'use client'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  ScanSearch, Layers, File, Upload, ChevronDown, Play,
  AlertTriangle, CheckSquare, Square as SquareIcon, Info,
  RefreshCw, CheckCircle2, Terminal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const BATCH_PCAPS = [
  'smtp_test.pcap',
  'imap_starttls_real.pcap',
  'pop3_stls_real.pcap',
  'smtp_starttls_real.pcap',
]

const BPF_PRESETS = [
  { label: 'Email Traffic (SMTP/IMAP/POP3)', value: 'tcp port 25 or 587 or 465 or 993 or 143 or 995 or 110' },
  { label: 'Broad TCP', value: 'tcp' },
  { label: 'Custom…', value: 'custom' },
]

export type SourceType = 'batch' | 'single' | 'upload'

export interface SelectedSource {
  type: SourceType
  batchFiles?: string[]       // for type='batch'
  singleFile?: string         // for type='single'
  uploadedFile?: File         // for type='upload'
}

interface SourceSelectorProps {
  onRun: (source: SelectedSource, sensorUrl?: string) => void
}

const SENSOR_CANDIDATES = ['http://localhost:5001', 'http://127.0.0.1:5001']

// Determine effective remote engine URL (explicit env var or same-origin on public deployment)
export function getEffectiveRemoteEngineUrl(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_FORENSIC_API_URL) {
    return process.env.NEXT_PUBLIC_FORENSIC_API_URL
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.') && !host.startsWith('10.')) {
      return window.location.origin
    }
  }
  return ''
}

export default function SourceSelector({ onRun }: SourceSelectorProps) {
  const [sourceType, setSourceType] = useState<SourceType | null>(null)
  const [batchChecked, setBatchChecked] = useState<string[]>([...BATCH_PCAPS])
  const [singleFile, setSingleFile] = useState(BATCH_PCAPS[0])
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local sensor connectivity status
  const [sensorStatus, setSensorStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [activeSensorUrl, setActiveSensorUrl] = useState<string>('http://localhost:5001')
  const [sensorInfo, setSensorInfo] = useState<{ version?: string; python?: string } | null>(null)
  const [permissionBlocked, setPermissionBlocked] = useState<boolean>(false)

  const checkSensor = useCallback(async () => {
    setSensorStatus('checking')
    let isPermBlocked = false

    try {
      if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
        // Query loopback-network (Chrome 142+ for localhost access)
        const p = await navigator.permissions.query({ name: 'loopback-network' as PermissionName }).catch(() => null)
        if (p && p.state === 'denied') {
          isPermBlocked = true
        }
      }
    } catch {
      // Permission API not supported or other browser
    }

    for (const url of SENSOR_CANDIDATES) {
      try {
        const res = await fetch(`${url}/ping?_t=${Date.now()}`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        })
        if (res.ok) {
          const data = await res.json()
          setActiveSensorUrl(url)
          setSensorInfo(data)
          setSensorStatus('online')
          setPermissionBlocked(false)
          return url
        }
      } catch (err: unknown) {
        const msg = String(err)
        if (msg.includes('Permission') || msg.includes('loopback') || msg.includes('denied')) {
          isPermBlocked = true
        }
      }
    }
    setPermissionBlocked(isPermBlocked)
    setSensorStatus('offline')
    return null
  }, [])

  useEffect(() => {
    checkSensor()
  }, [checkSensor])

  // Remote mode is available when running on public Vercel deployment or explicit remote URL is set
  const effectiveRemoteUrl = getEffectiveRemoteEngineUrl()
  const remoteAvailable = !!effectiveRemoteUrl && sensorStatus === 'offline'

  const isReady =
    (sensorStatus === 'online' || remoteAvailable) &&
    (sourceType === 'batch'
      ? batchChecked.length > 0
      : sourceType === 'single'
      ? !!singleFile
      : sourceType === 'upload'
      ? !!uploadedFile
      : false)

  const handleRun = () => {
    if (!sourceType || !isReady) return
    // Pass activeSensorUrl when local sensor is online; undefined triggers remote mode in index.tsx
    onRun({
      type: sourceType,
      batchFiles: sourceType === 'batch' ? batchChecked : undefined,
      singleFile: sourceType === 'single' ? singleFile : undefined,
      uploadedFile: sourceType === 'upload' ? (uploadedFile ?? undefined) : undefined,
    }, sensorStatus === 'online' ? activeSensorUrl : undefined)
  }

  const toggleBatch = (name: string) => {
    setBatchChecked((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name]
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base px-4 py-16 grid-bg">
      <div className="w-full max-w-2xl space-y-8 fade-in">
        {/* Title */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-bg-surface border border-blue/30 mb-2"
               style={{ boxShadow: '0 0 20px rgba(56,189,248,0.15)' }}>
            <ScanSearch className="w-7 h-7 text-blue" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Select Traffic Source</h1>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Choose a PCAP source below, then click{' '}
            <span className="text-green font-semibold">▶ Run Forensic Analysis</span> to begin.
            No analysis runs automatically.
          </p>
        </div>

        {/* Source Type Cards */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">
            Source Type
          </p>

          {/* Option A — Batch */}
          <div
            className={cn(
              'card cursor-pointer border transition-all',
              sourceType === 'batch'
                ? 'border-blue/50 bg-blue/5'
                : 'border-bg-border hover:border-blue/30'
            )}
            onClick={() => setSourceType('batch')}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all',
                sourceType === 'batch' ? 'border-blue bg-blue' : 'border-bg-border'
              )}>
                {sourceType === 'batch' && (
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue" />
                  <span className="text-sm font-semibold text-text-primary">
                    A. Batch Directory Analysis (All 4 PCAPs)
                  </span>
                </div>
                {sourceType === 'batch' && (
                  <div className="space-y-2 pl-1">
                    {BATCH_PCAPS.map((f) => (
                      <label
                        key={f}
                        className="flex items-center gap-2.5 cursor-pointer select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => toggleBatch(f)}
                          className={cn(
                            'w-4 h-4 rounded border transition-colors flex items-center justify-center flex-shrink-0',
                            batchChecked.includes(f)
                              ? 'bg-blue border-blue text-white'
                              : 'border-bg-border bg-bg-surface'
                          )}
                        >
                          {batchChecked.includes(f) && (
                            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className="text-xs font-mono text-text-secondary">{f}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option B — Single */}
          <div
            className={cn(
              'card cursor-pointer border transition-all',
              sourceType === 'single'
                ? 'border-blue/50 bg-blue/5'
                : 'border-bg-border hover:border-blue/30'
            )}
            onClick={() => setSourceType('single')}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all',
                sourceType === 'single' ? 'border-blue bg-blue' : 'border-bg-border'
              )}>
                {sourceType === 'single' && (
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <File className="w-4 h-4 text-green" />
                  <span className="text-sm font-semibold text-text-primary">
                    B. Select Single Existing PCAP
                  </span>
                </div>
                {sourceType === 'single' && (
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={singleFile}
                      onChange={(e) => setSingleFile(e.target.value)}
                      className="w-full bg-bg-surface border border-bg-border rounded-lg p-2 text-xs font-mono text-text-primary focus:outline-none focus:border-blue appearance-none pr-8"
                    >
                      {BATCH_PCAPS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Option C — Upload */}
          <div
            className={cn(
              'card cursor-pointer border transition-all',
              sourceType === 'upload'
                ? 'border-blue/50 bg-blue/5'
                : 'border-bg-border hover:border-blue/30'
            )}
            onClick={() => setSourceType('upload')}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-all',
                sourceType === 'upload' ? 'border-blue bg-blue' : 'border-bg-border'
              )}>
                {sourceType === 'upload' && (
                  <div className="w-full h-full rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple" />
                  <span className="text-sm font-semibold text-text-primary">
                    C. Upload PCAP File
                  </span>
                </div>
                {sourceType === 'upload' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pcap,.pcapng,.cap"
                      className="hidden"
                      onChange={(e) => setUploadedFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-4 text-xs transition-all',
                        uploadedFile
                          ? 'border-green/40 text-green bg-green/5'
                          : 'border-bg-border text-text-muted hover:border-purple/40 hover:text-purple'
                      )}
                    >
                      <Upload className="w-4 h-4" />
                      {uploadedFile ? uploadedFile.name : 'Click to select .pcap / .pcapng / .cap'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sensor Status Card */}
        {sensorStatus === 'checking' && (
          <div className="flex items-center gap-2.5 text-xs text-text-muted bg-bg-surface border border-bg-border rounded-xl p-3">
            <RefreshCw className="w-4 h-4 text-blue animate-spin flex-shrink-0" />
            <span className="leading-relaxed">
              Detecting local forensic sensor (<span className="font-mono text-text-secondary">http://localhost:5001</span>)…
            </span>
          </div>
        )}

        {sensorStatus === 'online' && (
          <div className="flex items-center justify-between bg-green/10 border border-green/30 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green animate-pulse" />
              <div>
                <div className="text-xs font-semibold text-green flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Local Forensic Sensor Online
                </div>
                <div className="text-[11px] font-mono text-text-muted mt-0.5">
                  Connected to {activeSensorUrl} (v{sensorInfo?.version ?? '3.0.0'}, Python {sensorInfo?.python ?? '3.x'})
                </div>
              </div>
            </div>
            <button
              onClick={checkSensor}
              title="Recheck sensor status"
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-surface border border-transparent hover:border-bg-border transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {sensorStatus === 'offline' && remoteAvailable && (
          <div className="flex items-center justify-between bg-blue/10 border border-blue/30 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue animate-pulse" />
              <div>
                <div className="text-xs font-semibold text-blue flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Remote Forensic Engine Available
                </div>
                <div className="text-[11px] font-mono text-text-muted mt-0.5">
                  Analysis will run on Vercel backend — no local sensor required
                </div>
              </div>
            </div>
            <button
              onClick={checkSensor}
              title="Recheck local sensor"
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-surface border border-transparent hover:border-bg-border transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {sensorStatus === 'offline' && !remoteAvailable && permissionBlocked && (
          <div className="bg-amber/10 border border-amber/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber" />
                <span>Browser Loopback Permission Required</span>
              </div>
              <button
                type="button"
                onClick={checkSensor}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-primary bg-bg-surface border border-bg-border rounded-lg hover:border-amber/50 transition-all hover:bg-bg-base"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber" />
                Retry Connection
              </button>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Google Chrome&apos;s <span className="text-text-primary font-semibold">Local Network Access</span> policy blocked the loopback request to <span className="font-mono text-text-secondary">localhost:5001</span>.
            </p>
            <div className="bg-bg-base border border-bg-border rounded-lg p-3 text-xs text-text-secondary space-y-2">
              <div className="font-semibold text-amber text-[11px] uppercase tracking-wider">How to grant permission in Chrome:</div>
              <ol className="list-decimal list-inside space-y-1 text-xs text-text-muted">
                <li>Click the <span className="text-text-primary font-semibold">Page settings icon (🎚️ sliders)</span> on the left of the Chrome address bar.</li>
                <li>Find <span className="text-text-primary font-semibold">&quot;Apps on device&quot;</span> and toggle it to <span className="text-green font-semibold">Allow</span>.</li>
                <li>Click <span className="text-blue font-semibold">Retry Connection</span> above.</li>
              </ol>
            </div>
            <div className="text-[11px] font-mono text-text-muted">
              Sensor status: Ensure <code className="text-green">venv/bin/python3 local_sensor/server.py</code> is running.
            </div>
          </div>
        )}

        {sensorStatus === 'offline' && !remoteAvailable && !permissionBlocked && (
          <div className="bg-amber/10 border border-amber/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber font-semibold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber" />
                <span>Local Sensor Offline</span>
              </div>
              <button
                type="button"
                onClick={checkSensor}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-text-primary bg-bg-surface border border-bg-border rounded-lg hover:border-amber/50 transition-all hover:bg-bg-base"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber" />
                Retry Connection
              </button>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Forensic PCAP analysis and Zeek engine require a running local sensor daemon (<span className="text-text-secondary font-mono">http://localhost:5001</span>). Analysis cannot start while the sensor is offline.
            </p>
            <div className="bg-bg-base border border-bg-border rounded-lg p-2.5 font-mono text-xs text-text-secondary space-y-1">
              <div className="text-text-muted text-[11px] flex items-center gap-1.5">
                <Terminal className="w-3 h-3" />
                Start local sensor in terminal:
              </div>
              <div className="text-green select-all pl-1">
                venv/bin/python3 local_sensor/server.py
              </div>
            </div>
          </div>
        )}

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={!isReady}
          className={cn(
            'w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-sm transition-all',
            isReady
              ? 'bg-green/20 border border-green/40 text-green hover:bg-green/30 cursor-pointer shadow-lg shadow-green/5'
              : 'bg-bg-surface border border-bg-border text-text-muted cursor-not-allowed opacity-60'
          )}
        >
          <Play className="w-5 h-5" />
          {sensorStatus === 'checking'
            ? 'Connecting to Sensor…'
            : remoteAvailable && !sourceType
            ? '▶ Run Remote Forensic Analysis (Select Source Above)'
            : remoteAvailable
            ? '▶ Run Remote Forensic Analysis'
            : sensorStatus === 'offline'
            ? '▶ Run Forensic Analysis (Local Sensor Offline)'
            : !sourceType
            ? '▶ Run Forensic Analysis (Select Source Above)'
            : '▶ Run Forensic Analysis'}
        </button>
      </div>
    </div>
  )
}
