'use client'
import React from 'react'
import { ScanSearch } from 'lucide-react'

interface NoAnalysisStateProps {
  pageName: string
  onGoHome?: () => void
}

export default function NoAnalysisState({ pageName, onGoHome }: NoAnalysisStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-bg-surface border border-bg-border flex items-center justify-center">
        <ScanSearch className="w-8 h-8 text-text-muted" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-bold text-text-primary">No Analysis Run Yet</h3>
        <p className="text-xs text-text-muted max-w-xs leading-relaxed">
          {pageName} data will appear here after you select a traffic source and run forensic analysis.
        </p>
      </div>
      {onGoHome && (
        <button
          onClick={onGoHome}
          className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-blue/15 border border-blue/30 text-blue font-semibold hover:bg-blue/25 transition-all text-xs"
        >
          ← Select Traffic Source
        </button>
      )}
    </div>
  )
}
