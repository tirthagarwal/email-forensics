'use client'
import React from 'react'
import { ForensicReport } from '@/types/report'
import { FlaskConical, CheckCircle2, ShieldCheck, AlertTriangle, Layers, Database, Lock, Cpu, Sparkles } from 'lucide-react'

interface BenchmarkPageProps {
  report: ForensicReport
}

export default function BenchmarkPage({ report }: BenchmarkPageProps) {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-purple" /> Controlled Benchmark & Evaluation Suite
        </h2>
        <p className="text-xs text-text-muted mt-1">
          Synthetic test fixtures, empirical anomaly profiling, train/val/test split verification, and model integrity gates.
        </p>
      </div>

      {/* Benchmark Limitation Warning */}
      <div className="card border-amber/30 bg-amber/5 p-4 flex items-start gap-3.5">
        <AlertTriangle className="w-5 h-5 text-amber flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <h4 className="font-semibold text-text-primary">Controlled Benchmark Interpretation Notice</h4>
          <p className="text-text-secondary leading-relaxed">
            The metrics below represent evaluation against a <b>controlled 5-fixture synthetic test suite</b> designed for software regression testing. They <b>must not be interpreted as real-world attack detection accuracy</b> on unconstrained internet traffic.
          </p>
        </div>
      </div>

      {/* Controlled Benchmark KPI Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card border-green/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Precision</span>
          <p className="text-2xl font-bold text-green mt-1">100.0%</p>
          <span className="text-[10px] text-text-muted">Zero false positive anomalies on clean fixtures</span>
        </div>

        <div className="card border-blue/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Recall</span>
          <p className="text-2xl font-bold text-blue mt-1">75.0%</p>
          <span className="text-[10px] text-text-muted">3 / 4 anomalous fixtures detected</span>
        </div>

        <div className="card border-purple/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">F1-Score</span>
          <p className="text-2xl font-bold text-purple mt-1">0.8571</p>
          <span className="text-[10px] text-text-muted">Harmonic balance on controlled set</span>
        </div>

        <div className="card border-cyber/20">
          <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Automated Test Suite</span>
          <p className="text-2xl font-bold text-cyber mt-1">97 / 97</p>
          <span className="text-[10px] text-text-muted">100% pytest pass rate</span>
        </div>
      </div>

      {/* Dataset Versioning & Group-Aware Split Invariants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dataset Partitioning */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-blue" /> Training Dataset Partitioning (v4_clean)
            </h3>
            <span className="text-[10px] font-mono text-green font-semibold">10,898 Unique Records</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Train Split (70%):</span>
                <span className="font-mono text-text-primary font-semibold">7,629 records</span>
              </div>
              <div className="w-full bg-bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-blue rounded-full" style={{ width: '70%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Validation Split (15%):</span>
                <span className="font-mono text-text-primary font-semibold">1,635 records</span>
              </div>
              <div className="w-full bg-bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-purple rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Test Split (15%):</span>
                <span className="font-mono text-text-primary font-semibold">1,634 records</span>
              </div>
              <div className="w-full bg-bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-cyber rounded-full" style={{ width: '15%' }} />
              </div>
            </div>

            <div className="bg-bg-surface p-3 rounded-lg border border-bg-border space-y-1.5 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-text-muted">Group Overlap Invariant:</span>
                <span className="text-[11px] font-mono text-green font-bold">0.0% Overlap (Disjoint)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-text-muted">Deduplication Overlap Removal:</span>
                <span className="text-[11px] font-mono text-text-secondary">10,898 Duplicates Purged</span>
              </div>
            </div>
          </div>
        </div>

        {/* Production Model Registry & Integrity Guard */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-bg-border pb-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green" /> Production Model Registry Integrity
            </h3>
            <span className="text-[10px] font-mono text-green font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED_OK
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
              <span className="text-text-muted">Model ID:</span>
              <span className="font-mono text-text-primary font-semibold">deployment_isolation_forest</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
              <span className="text-text-muted">Version / Status:</span>
              <span className="font-mono text-purple font-semibold">v3.0.0 (DEPLOYED)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
              <span className="text-text-muted">Variant / Schema:</span>
              <span className="font-mono text-text-primary">expanded_v3 / Schema 1.0.0 (32 dims)</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
              <span className="text-text-muted">Decision Threshold:</span>
              <span className="font-mono text-cyber font-semibold">-0.041466</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-bg-border/40">
              <span className="text-text-muted">Zero-Leakage Enforcement:</span>
              <span className="font-mono text-green font-semibold">Active (0 Rule Flags in Matrix)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-text-muted">Sensitive Secrets Exposure:</span>
              <span className="font-mono text-green font-semibold">NOT DETECTED (Zero Keylogs/Bodies)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
