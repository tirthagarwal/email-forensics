import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRiskColor(level: string): string {
  const l = level?.toUpperCase()
  if (l === 'CRITICAL') return 'text-red'
  if (l === 'HIGH')     return 'text-red'
  if (l === 'MODERATE') return 'text-amber'
  if (l === 'LOW')      return 'text-green'
  if (l === 'MINIMAL')  return 'text-blue'
  return 'text-text-secondary'
}

export function getRiskBg(level: string): string {
  const l = level?.toUpperCase()
  if (l === 'CRITICAL') return 'bg-red/10 border-red/30 text-red'
  if (l === 'HIGH')     return 'bg-red/10 border-red/30 text-red'
  if (l === 'MODERATE') return 'bg-amber/10 border-amber/30 text-amber'
  if (l === 'LOW')      return 'bg-green/10 border-green/30 text-green'
  if (l === 'MINIMAL')  return 'bg-blue/10 border-blue/30 text-blue'
  return 'bg-bg-muted border-bg-border text-text-secondary'
}

export function getSeverityBadge(severity: string): string {
  const s = severity?.toUpperCase()
  if (s === 'CRITICAL') return 'badge-fail'
  if (s === 'HIGH')     return 'badge-fail'
  if (s === 'MEDIUM')   return 'badge-warn'
  if (s === 'LOW')      return 'badge-info'
  return 'badge-info'
}

export function getStatusBadge(status: string): string {
  const s = status?.toUpperCase()
  if (s === 'PASS')       return 'badge-pass'
  if (s === 'WARNING')    return 'badge-warn'
  if (s === 'VIOLATION')  return 'badge-fail'
  if (s === 'NOT OBSERVED') return 'badge-limited'
  if (s === 'VISIBILITY LIMITED') return 'badge-limited'
  return 'badge-info'
}

export function getStatusColor(status: string): string {
  const s = status?.toUpperCase()
  if (s === 'PASS')             return '#22d3a6'
  if (s === 'WARNING')          return '#f59e0b'
  if (s === 'VIOLATION')        return '#f43f5e'
  if (s === 'NOT OBSERVED')     return '#a78bfa'
  if (s === 'VISIBILITY LIMITED') return '#a78bfa'
  return '#8da4bf'
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function formatDuration(secs: number): string {
  if (!secs) return '0s'
  if (secs < 1) return `${(secs * 1000).toFixed(0)}ms`
  if (secs < 60) return `${secs.toFixed(2)}s`
  return `${Math.floor(secs / 60)}m ${(secs % 60).toFixed(0)}s`
}

export function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    })
  } catch { return ts }
}

export function truncateMiddle(str: string, maxLen = 40): string {
  if (!str || str.length <= maxLen) return str
  const half = Math.floor(maxLen / 2)
  return str.slice(0, half) + '…' + str.slice(-half)
}

export function getRiskArcDash(score: number, r = 80): { dasharray: string; dashoffset: string } {
  const circumference = Math.PI * r  // half circle
  const filled = circumference * (1 - score / 100)
  return {
    dasharray: `${circumference} ${circumference}`,
    dashoffset: String(filled),
  }
}
