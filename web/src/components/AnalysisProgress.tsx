'use client'
import React from 'react'
import { Loader2, CheckCircle2, XCircle, Terminal } from 'lucide-react'

export interface AnalysisStep {
  id: string
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
}

interface AnalysisProgressProps {
  steps: AnalysisStep[]
  sourceSummary: string
  logs: string[]
  failed?: boolean
  errorMessage?: string
  onCancel?: () => void
}

export default function AnalysisProgress({
  steps,
  sourceSummary,
  logs,
  failed,
  errorMessage,
  onCancel,
}: AnalysisProgressProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-text-primary flex items-center justify-center gap-2">
            {failed ? (
              <XCircle className="w-6 h-6 text-red" />
            ) : (
              <Loader2 className="w-6 h-6 text-blue animate-spin" />
            )}
            {failed ? 'Analysis Failed' : 'Running Forensic Analysis'}
          </h2>
          <p className="text-xs text-text-muted font-mono">{sourceSummary}</p>
        </div>

        {/* Steps */}
        <div className="card space-y-3">
          <h3 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b border-bg-border pb-2">
            Pipeline Progress
          </h3>
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3 text-xs">
              {step.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green flex-shrink-0" />}
              {step.status === 'running' && <Loader2 className="w-4 h-4 text-blue animate-spin flex-shrink-0" />}
              {step.status === 'error' && <XCircle className="w-4 h-4 text-red flex-shrink-0" />}
              {step.status === 'pending' && (
                <div className="w-4 h-4 rounded-full border border-bg-border flex-shrink-0" />
              )}
              <span
                className={
                  step.status === 'done'
                    ? 'text-green'
                    : step.status === 'running'
                    ? 'text-blue'
                    : step.status === 'error'
                    ? 'text-red'
                    : 'text-text-muted'
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Error Card */}
        {failed && errorMessage && (() => {
          const isTraceback = errorMessage.includes('Traceback') || errorMessage.includes('File "') || errorMessage.includes('Error:')
          const cleanSummary = isTraceback
            ? 'Forensic analysis could not be completed. The sensor encountered an unrecoverable processing error or invalid capture structure.'
            : errorMessage

          return (
            <div className="card border-red/30 bg-red/5 p-4 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red" />
                <p className="font-semibold text-red">Forensic Analysis Encountered an Error</p>
              </div>
              <p className="text-text-secondary leading-relaxed">{cleanSummary}</p>
              {isTraceback && (
                <details className="mt-2 pt-2 border-t border-red/20 text-[11px] text-text-muted cursor-pointer">
                  <summary className="font-mono text-[10px] text-red/80 hover:text-red select-none">
                    Technical Details (Diagnostic Log)
                  </summary>
                  <pre className="mt-2 p-2.5 bg-bg-base/90 rounded border border-bg-border font-mono text-[10px] text-text-muted overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
                    {errorMessage}
                  </pre>
                </details>
              )}
            </div>
          )
        })()}

        {/* Log console */}
        {logs.length > 0 && (
          <div className="card space-y-2">
            <span className="text-[10px] text-text-muted uppercase font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Pipeline Log
            </span>
            <div className="bg-bg-base p-3 rounded-lg border border-bg-border font-mono text-[11px] text-cyber/90 h-36 overflow-y-auto space-y-0.5">
              {logs.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {(failed || onCancel) && (
          <div className="flex justify-center gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-5 py-2 rounded-lg bg-bg-surface border border-bg-border text-text-secondary hover:text-text-primary text-xs transition-all"
              >
                ← Back to Source Selection
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
