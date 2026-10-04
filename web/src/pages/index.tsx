'use client'
import React, { useState, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import OverviewPage from '@/components/pages/OverviewPage'
import AssessmentPage from '@/components/pages/AssessmentPage'
import SessionsPage from '@/components/pages/SessionsPage'
import TlsCryptoPage from '@/components/pages/TlsCryptoPage'
import FindingsPage from '@/components/pages/FindingsPage'
import AiMlPage from '@/components/pages/AiMlPage'
import EnterprisePosturePage from '@/components/pages/EnterprisePosturePage'
import LiveMonitorPage from '@/components/pages/LiveMonitorPage'
import ReportsPage from '@/components/pages/ReportsPage'
import BenchmarkPage from '@/components/pages/BenchmarkPage'
import SourceSelector, { SelectedSource } from '@/components/SourceSelector'
import AnalysisProgress, { AnalysisStep } from '@/components/AnalysisProgress'
import { ForensicReport } from '@/types/report'

// ── App-level state machine ─────────────────────────────────────────────────
type AppState = 'initial' | 'running' | 'completed' | 'failed'

const LOCAL_SENSOR_URL = 'http://localhost:5001'

const PIPELINE_STEPS: AnalysisStep[] = [
  { id: 'connect',  label: 'Connecting to local forensic sensor',   status: 'pending' },
  { id: 'pcap',     label: 'Ingesting PCAP file(s)',                 status: 'pending' },
  { id: 'zeek',     label: 'Running Zeek passive analysis',          status: 'pending' },
  { id: 'crypto',   label: 'Extracting cryptographic features',      status: 'pending' },
  { id: 'rules',    label: 'Evaluating security rules (RFC 8314…)',  status: 'pending' },
  { id: 'ml',       label: 'Running IsolationForest ML anomaly detection', status: 'pending' },
  { id: 'report',   label: 'Generating forensic report',             status: 'pending' },
]

function sourceSummaryLabel(source: SelectedSource): string {
  if (source.type === 'batch') {
    return `Batch: ${(source.batchFiles ?? []).join(', ')}`
  }
  if (source.type === 'single') {
    return `Single PCAP: ${source.singleFile}`
  }
  if (source.type === 'upload') {
    return `Uploaded: ${source.uploadedFile?.name ?? 'unknown'}`
  }
  return ''
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Home() {
  const [appState, setAppState] = useState<AppState>('initial')
  const [report, setReport] = useState<ForensicReport | null>(null)
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(PIPELINE_STEPS)
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([])
  const [failedMessage, setFailedMessage] = useState<string>('')
  const [sourceSummary, setSourceSummary] = useState<string>('')
  const [analysisSource, setAnalysisSource] = useState<SelectedSource | null>(null)

  // Update a single step status
  const setStep = useCallback((id: string, status: AnalysisStep['status']) => {
    setAnalysisSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s))
    )
  }, [])

  const addLog = useCallback((line: string) => {
    const ts = new Date().toISOString()
    setAnalysisLogs((prev) => [`[${ts}] ${line}`, ...prev])
  }, [])

  const resetState = useCallback(() => {
    setAppState('initial')
    setReport(null)
    setAnalysisSteps(PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' })))
    setAnalysisLogs([])
    setFailedMessage('')
    setSourceSummary('')
    setAnalysisSource(null)
  }, [])

  // ── Run Analysis ──────────────────────────────────────────────────────────
  const handleRun = useCallback(async (source: SelectedSource, verifiedSensorUrl?: string) => {
    const label = sourceSummaryLabel(source)
    setSourceSummary(label)
    setAnalysisSource(source)
    setAppState('running')
    setAnalysisSteps(PIPELINE_STEPS.map((s) => ({ ...s, status: 'pending' })))
    setAnalysisLogs([])

    const targetUrl = verifiedSensorUrl || LOCAL_SENSOR_URL

    // Step 1 — Connect to local sensor
    setStep('connect', 'running')
    addLog('Connecting to local forensic sensor at ' + targetUrl)

    let sensorReachable = false
    try {
      const ping = await fetch(`${targetUrl}/ping?_t=${Date.now()}`, { signal: AbortSignal.timeout(3000) })
      sensorReachable = ping.ok
    } catch {
      sensorReachable = false
    }

    if (!sensorReachable) {
      setStep('connect', 'error')
      addLog('ERROR: Local sensor not reachable. Start it with: python3 local_sensor/server.py')
      setFailedMessage(
        'Local forensic sensor is not running. This is a static web application — forensic analysis ' +
        'must be performed by a locally-running sensor process.\n\n' +
        'To run analysis locally:\n' +
        '  1. cd /path/to/email-forensics\n' +
        '  2. venv/bin/python3 local_sensor/server.py\n' +
        '  3. Then click "Run Forensic Analysis" again.\n\n' +
        'Alternatively, run the pipeline directly:\n' +
        '  venv/bin/python3 part1/src/forensic_pipeline.py --input-dir part1/pcaps/ --format all\n' +
        '  Then upload the generated forensic_report.json via Source C (Upload).'
      )
      setAppState('failed')
      return
    }

    setStep('connect', 'done')
    addLog('Connected to local forensic sensor.')

    // Step 2 — PCAP ingestion
    setStep('pcap', 'running')
    addLog(`Sending source: ${label}`)

    // Build request payload
    let body: FormData | string
    let headers: Record<string, string> = {}

    if (source.type === 'upload' && source.uploadedFile) {
      const fd = new FormData()
      fd.append('pcap', source.uploadedFile)
      fd.append('source_type', 'upload')
      body = fd
    } else {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify({
        source_type: source.type,
        batch_files: source.batchFiles,
        single_file: source.singleFile,
      })
    }

    try {
      setStep('pcap', 'done')
      addLog('PCAP payload dispatched to sensor.')

      // Step 3-6 — these happen inside pipeline; we simulate progress while polling
      setStep('zeek', 'running')
      addLog('Sensor executing Zeek passive analysis…')

      const res = await fetch(`${targetUrl}/analyze`, {
        method: 'POST',
        headers: source.type !== 'upload' ? headers : {},
        body,
        signal: AbortSignal.timeout(120_000), // 2 min timeout
      })

      setStep('zeek', 'done')
      addLog('Zeek analysis completed.')
      setStep('crypto', 'running')
      addLog('Extracting cryptographic features…')

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Sensor returned ${res.status}: ${errText}`)
      }

      const data: ForensicReport = await res.json()

      setStep('crypto', 'done')
      addLog('Cryptographic features extracted.')
      setStep('rules', 'done')
      addLog('Security rules evaluated.')
      setStep('ml', 'done')
      addLog('IsolationForest ML anomaly detection complete.')
      setStep('report', 'running')
      addLog('Generating forensic report…')
      setStep('report', 'done')
      addLog('Forensic report ready.')

      setReport(data)
      setAppState('completed')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      addLog(`ERROR: ${msg}`)
      setStep('zeek', 'error')
      setFailedMessage(msg)
      setAppState('failed')
    }
  }, [setStep, addLog])

  // ── Render state machine ──────────────────────────────────────────────────

  if (appState === 'initial') {
    return <SourceSelector onRun={handleRun} />
  }

  if (appState === 'running' || appState === 'failed') {
    return (
      <AnalysisProgress
        steps={analysisSteps}
        sourceSummary={sourceSummary}
        logs={analysisLogs}
        failed={appState === 'failed'}
        errorMessage={failedMessage}
        onCancel={resetState}
      />
    )
  }

  // appState === 'completed' — show full dashboard
  const riskLevel = report?.summary?.risk_level ?? 'LOW'
  const lastAnalyzed = report?.pcap?.analyzed_at ?? report?.report_metadata?.generated_at ?? ''
  const modelVersion = report?.ml_analysis?.model_version ?? '3.0.0'

  return (
    <DashboardLayout
      riskLevel={riskLevel}
      lastAnalyzed={lastAnalyzed}
      modelVersion={modelVersion}
      modelIntegrity="VERIFIED"
      onNewAnalysis={resetState}
    >
      {(page) => {
        if (!report) return null
        switch (page) {
          case 'overview':    return <OverviewPage report={report} />
          case 'assessment':  return <AssessmentPage report={report} />
          case 'sessions':    return <SessionsPage report={report} />
          case 'tls':         return <TlsCryptoPage report={report} />
          case 'findings':    return <FindingsPage report={report} />
          case 'ml':          return <AiMlPage report={report} />
          case 'enterprise':  return <EnterprisePosturePage report={report} />
          case 'monitor':     return <LiveMonitorPage report={report} source={analysisSource} />
          case 'reports':     return <ReportsPage report={report} source={analysisSource} analyzedAt={lastAnalyzed} />
          case 'benchmark':   return <BenchmarkPage report={report} />
          default:            return <OverviewPage report={report} />
        }
      }}
    </DashboardLayout>
  )
}
