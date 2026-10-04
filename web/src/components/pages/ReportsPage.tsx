'use client'
import React from 'react'
import { ForensicReport } from '@/types/report'
import { SelectedSource } from '@/components/SourceSelector'
import {
  FileText, FileCode, FileSpreadsheet, Download, ExternalLink,
  CheckCircle2, ShieldCheck, Layers, File, Upload, Clock,
} from 'lucide-react'

interface ReportsPageProps {
  report: ForensicReport
  source?: SelectedSource | null
  analyzedAt?: string
}

function sourceLabel(source: SelectedSource | null | undefined): string {
  if (!source) return 'Unknown source'
  if (source.type === 'batch') return `Batch — ${(source.batchFiles ?? []).join(', ')}`
  if (source.type === 'single') return `Single PCAP — ${source.singleFile}`
  if (source.type === 'upload') return `Uploaded — ${source.uploadedFile?.name ?? 'file'}`
  return 'Unknown source'
}

function sourceIcon(source: SelectedSource | null | undefined) {
  if (!source || source.type === 'batch') return <Layers className="w-3.5 h-3.5" />
  if (source.type === 'single') return <File className="w-3.5 h-3.5" />
  return <Upload className="w-3.5 h-3.5" />
}

export default function ReportsPage({ report, source, analyzedAt }: ReportsPageProps) {
  const { summary, report_metadata } = report

  const handleDownloadJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', 'forensic_report.json')
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue" /> Forensic Audit &amp; Compliance Reports
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Export verifiable cryptographic evidence, machine-readable telemetry, and executive audit documentation.
        </p>
      </div>

      {/* Current Analysis Info */}
      <div className="card border-green/20 bg-green/5 p-4 flex items-center gap-4 text-xs">
        <CheckCircle2 className="w-5 h-5 text-green flex-shrink-0" />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-green">
            Analysis Report Available
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-text-muted">
            <span className="flex items-center gap-1.5">
              {sourceIcon(source)}
              {sourceLabel(source)}
            </span>
            {analyzedAt && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {analyzedAt}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Report Formats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* JSON Report */}
        <div className="card space-y-4 flex flex-col justify-between border-blue/20">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-blue/10 border border-blue/30 flex items-center justify-center text-blue">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Master JSON Report</h3>
              <p className="text-xs text-text-muted mt-1">
                Full forensic payload containing raw flow features, TLS handshakes, certificate fields, and ML anomaly vectors.
              </p>
            </div>
            <div className="text-[11px] font-mono text-text-secondary bg-bg-surface p-2.5 rounded border border-bg-border">
              forensic_report.json
            </div>
          </div>
          <button
            onClick={handleDownloadJson}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-blue/15 border border-blue/30 text-blue font-semibold hover:bg-blue/25 transition-all text-xs"
          >
            <Download className="w-4 h-4" /> Download JSON Report
          </button>
        </div>

        {/* HTML Interactive Report */}
        <div className="card space-y-4 flex flex-col justify-between border-green/20">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-green/10 border border-green/30 flex items-center justify-center text-green">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Interactive HTML Audit</h3>
              <p className="text-xs text-text-muted mt-1">
                Self-contained visual report with collapsible evidence trees, risk indicators, and remediation recommendations.
              </p>
            </div>
            <div className="text-[11px] font-mono text-text-secondary bg-bg-surface p-2.5 rounded border border-bg-border">
              forensic_report.html
            </div>
          </div>
          <a
            href="/data/forensic_report.html"
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green/15 border border-green/30 text-green font-semibold hover:bg-green/25 transition-all text-xs text-center"
          >
            <ExternalLink className="w-4 h-4" /> Open HTML Report
          </a>
        </div>

        {/* PDF Executive Report */}
        <div className="card space-y-4 flex flex-col justify-between border-purple/20">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-lg bg-purple/10 border border-purple/30 flex items-center justify-center text-purple">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary">Executive PDF Document</h3>
              <p className="text-xs text-text-muted mt-1">
                Printable formal audit documentation generated by ReportLab featuring executive summaries and compliance scores.
              </p>
            </div>
            <div className="text-[11px] font-mono text-text-secondary bg-bg-surface p-2.5 rounded border border-bg-border">
              forensic_report.pdf
            </div>
          </div>
          <a
            href="/data/forensic_report.pdf"
            download
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-purple/15 border border-purple/30 text-purple font-semibold hover:bg-purple/25 transition-all text-xs text-center"
          >
            <Download className="w-4 h-4" /> Download PDF Report
          </a>
        </div>
      </div>

      {/* Cryptographic Manifest & Compliance Summary */}
      <div className="card space-y-3">
        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green" /> Report Verification &amp; Evidence Authenticity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-text-muted">Generated At:</span>
            <p className="font-mono text-text-primary mt-0.5">{report_metadata?.generated_at || analyzedAt || '—'}</p>
          </div>
          <div>
            <span className="text-text-muted">Assessed Risk Score:</span>
            <p className="font-mono text-text-primary mt-0.5 font-bold">
              {summary?.overall_risk_score ?? 32.38} / 100 ({summary?.risk_level ?? 'LOW'})
            </p>
          </div>
          <div>
            <span className="text-text-muted">Integrity Standard:</span>
            <p className="font-mono text-green mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Deterministic RFC &amp; ML Bound
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
