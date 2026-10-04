'use client'
import React, { useState } from 'react'
import {
  LayoutDashboard, ShieldCheck, Network, Lock, AlertTriangle,
  Brain, Building2, Radio, FileText, FlaskConical, ChevronLeft,
  ChevronRight, Activity, Cpu, Menu, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { id: 'overview',    label: 'Overview',            icon: LayoutDashboard },
  { id: 'assessment',  label: 'Security Assessment', icon: ShieldCheck },
  { id: 'sessions',    label: 'Sessions',            icon: Network },
  { id: 'tls',         label: 'TLS & Cryptography',  icon: Lock },
  { id: 'findings',    label: 'Security Findings',   icon: AlertTriangle },
  { id: 'ml',          label: 'AI / ML',             icon: Brain },
  { id: 'enterprise',  label: 'Enterprise Posture',  icon: Building2 },
  { id: 'monitor',     label: 'Live Monitor',        icon: Radio },
  { id: 'reports',     label: 'Reports',             icon: FileText },
  { id: 'benchmark',   label: 'Benchmark',           icon: FlaskConical },
]

interface LayoutProps {
  children: (page: string) => React.ReactNode
  riskLevel?: string
  lastAnalyzed?: string
  modelVersion?: string
  modelIntegrity?: string
  onNewAnalysis?: () => void
}

export default function DashboardLayout({
  children,
  riskLevel = 'LOW',
  lastAnalyzed = '',
  modelVersion = '3.0.0',
  modelIntegrity = 'VERIFIED',
  onNewAnalysis,
}: LayoutProps) {
  const [page, setPage] = useState('overview')
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const riskColor = {
    CRITICAL: '#f43f5e', HIGH: '#f43f5e',
    MODERATE: '#f59e0b', LOW: '#22d3a6', MINIMAL: '#38bdf8',
  }[riskLevel?.toUpperCase()] ?? '#22d3a6'

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden"
             onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:relative z-50 h-full flex flex-col border-r border-bg-border bg-bg-surface transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[220px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-bg-border min-h-[60px]">
          <div className="relative flex-shrink-0 w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-blue/20 border border-blue/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue" />
            </div>
            <div className="absolute inset-0 rounded-lg animate-pulse-slow"
                 style={{ boxShadow: '0 0 12px rgba(56,189,248,.4)' }} />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-text-primary leading-tight truncate">Email Crypto</p>
              <p className="text-[10px] text-text-muted leading-tight truncate">Forensic Framework</p>
            </div>
          )}
          <button onClick={() => { setCollapsed(!collapsed); setMobileOpen(false); }}
                  className="ml-auto text-text-muted hover:text-text-primary transition-colors hidden lg:flex">
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button key={item.id}
                      onClick={() => { setPage(item.id); setMobileOpen(false); }}
                      className={cn('nav-item w-full', active && 'active')}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer meta */}
        {!collapsed && (
          <div className="p-3 border-t border-bg-border space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-3 h-3 text-purple flex-shrink-0" />
              <span className="text-[10px] text-text-muted">Model v{modelVersion}</span>
              <span className={cn('ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded',
                modelIntegrity === 'VERIFIED' ? 'bg-green/10 text-green' : 'bg-amber/10 text-amber')}>
                {modelIntegrity}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 flex-shrink-0" style={{ color: riskColor }} />
              <span className="text-[10px] text-text-muted">Risk:</span>
              <span className="text-[10px] font-semibold" style={{ color: riskColor }}>{riskLevel}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-4 lg:px-6 border-b border-bg-border bg-bg-surface min-h-[60px] flex-shrink-0">
          <button className="lg:hidden text-text-muted hover:text-text-primary"
                  onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-text-primary leading-tight hidden sm:block">
              Email Cryptographic Security Posture
            </h1>
            <p className="text-[10px] text-text-muted hidden sm:block">
              AI-Assisted Passive Network Forensic Framework
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {lastAnalyzed && (
              <span className="text-[10px] text-text-muted hidden md:block">
                Analyzed: {lastAnalyzed}
              </span>
            )}
            {onNewAnalysis && (
              <button
                onClick={onNewAnalysis}
                className="text-[10px] px-2.5 py-1 rounded-full bg-blue/10 border border-blue/30 text-blue hover:bg-blue/20 transition-all font-semibold"
              >
                + New Analysis
              </button>
            )}
            <span className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full bg-green/10 border border-green/30 text-green">
              <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
              Analysis Complete
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 grid-bg">
          <div className="fade-in">
            {children(page)}
          </div>
        </main>
      </div>
    </div>
  )
}
