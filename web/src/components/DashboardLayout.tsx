import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  Shield,
  LayoutDashboard,
  Dog as DogIcon,
  QrCode,
  Syringe,
  Stethoscope,
  Activity,
  Tag,
  MapPin,
  Bell,
  Sparkles,
  BarChart3,
  MessageSquareWarning,
  CheckSquare,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronDown,
  RotateCcw,
  AlertTriangle,
  UserCheck
} from 'lucide-react'
import { useRescueAI } from '../lib/store'
import { UserRole } from '../lib/types'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  actions?: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [notifMenuOpen, setNotifMenuOpen] = useState(false)

  const {
    currentUser,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    loginAsRole,
    logout,
    isDemoMode,
    resetToDemoData,
  } = useRescueAI()

  const currentRole = currentUser?.role || 'admin'
  const unreadNotifs = notifications.filter((n) => !n.is_read)

  // Navigation Items with role permission rules
  const allNavItems = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'ngo_worker', 'veterinarian', 'municipal_officer'] },
    { name: 'Dog Registry', href: '/dashboard/dogs', icon: DogIcon, roles: ['admin', 'ngo_worker', 'veterinarian', 'municipal_officer'] },
    { name: 'QR Scanner', href: '/scan', icon: QrCode, roles: ['admin', 'ngo_worker', 'veterinarian', 'municipal_officer', 'citizen'] },
    { name: 'Vaccination Records', href: '/dashboard/vaccinations', icon: Syringe, roles: ['admin', 'ngo_worker', 'veterinarian', 'municipal_officer'] },
    { name: 'Medical History', href: '/dashboard/medical', icon: Stethoscope, roles: ['admin', 'veterinarian', 'ngo_worker'] },
    { name: 'Activity & Vitals', href: '/dashboard/activity', icon: Activity, roles: ['admin', 'ngo_worker', 'veterinarian'] },
    { name: 'Device Management', href: '/dashboard/devices', icon: Tag, roles: ['admin', 'ngo_worker', 'municipal_officer'] },
    { name: 'GPS & Territory Map', href: '/dashboard/map', icon: MapPin, roles: ['admin', 'ngo_worker', 'municipal_officer'] },
    { name: 'Alerts & Reminders', href: '/dashboard/alerts', icon: Bell, badge: unreadNotifs.length, roles: ['admin', 'ngo_worker', 'veterinarian', 'municipal_officer'] },
    { name: 'AI & Automation', href: '/dashboard/ai', icon: Sparkles, roles: ['admin', 'ngo_worker', 'municipal_officer', 'veterinarian'] },
    { name: 'Analytics & Reports', href: '/dashboard/analytics', icon: BarChart3, roles: ['admin', 'municipal_officer', 'ngo_worker'] },
    { name: 'Community Reports', href: '/dashboard/reports', icon: MessageSquareWarning, roles: ['admin', 'ngo_worker', 'municipal_officer'] },
    { name: 'Tasks & Field Work', href: '/dashboard/tasks', icon: CheckSquare, roles: ['admin', 'ngo_worker', 'veterinarian'] },
    { name: 'User Management', href: '/dashboard/users', icon: Users, roles: ['admin'] },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings, roles: ['admin', 'ngo_worker', 'veterinarian', 'municipal_officer'] },
  ]

  const navItems = allNavItems.filter((item) => item.roles.includes(currentRole))

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === '/dashboard'
    }
    return router.pathname.startsWith(href)
  }

  const roleLabels: Record<UserRole, { label: string; color: string; desc: string }> = {
    admin: { label: 'Administrator', color: 'bg-purple-100 text-purple-800 border-purple-300', desc: 'Full platform access' },
    ngo_worker: { label: 'NGO Field Officer', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', desc: 'Dog registry, tags, field observations' },
    veterinarian: { label: 'Veterinarian (DVM)', color: 'bg-blue-100 text-blue-800 border-blue-300', desc: 'Medical records, diagnosis, vaccinations' },
    municipal_officer: { label: 'Municipal Authority', color: 'bg-amber-100 text-amber-800 border-amber-300', desc: 'Vaccination coverage, rabies risk hotspots' },
    citizen: { label: 'Citizen / Public', color: 'bg-charcoal-100 text-charcoal-800 border-charcoal-300', desc: 'QR scan and public reports' },
  }

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-warm-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-charcoal-600 hover:bg-warm-100"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-800 flex items-center justify-center text-white">
              <Shield className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg text-forest-950">Rescue<span className="text-teal-600">AI</span></span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="p-2 text-charcoal-600 relative hover:bg-warm-100 rounded-lg"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
            )}
          </button>
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-warm-100 text-charcoal-800 flex items-center gap-1"
          >
            <span className="truncate max-w-[90px]">{roleLabels[currentRole]?.label || currentRole}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop & Mobile Overlay */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-warm-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-warm-200 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-forest-800 flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-forest-950">Rescue<span className="text-teal-600">AI</span></span>
              </div>
              <p className="text-[10px] text-charcoal-500 font-medium tracking-wide">
                Digital Canine Welfare
              </p>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-charcoal-500 hover:bg-warm-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode & Role Switcher Banner */}
        <div className="p-3 bg-warm-100/70 border-b border-warm-200">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-charcoal-500 font-medium">Active Role</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold uppercase">
              Demo Mode
            </span>
          </div>

          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="w-full flex items-center justify-between p-2 rounded-lg bg-white border border-warm-300 text-xs font-semibold text-charcoal-800 hover:border-forest-500 transition-colors shadow-2xs"
            >
              <div className="flex items-center gap-2 truncate">
                <UserCheck className="w-3.5 h-3.5 text-forest-700 flex-shrink-0" />
                <span className="truncate">{roleLabels[currentRole]?.label}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-charcoal-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-warm-200 rounded-xl shadow-soft-lg z-50 py-1.5 text-xs">
                <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-charcoal-400">
                  Switch Test Persona:
                </div>
                {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      loginAsRole(r)
                      setRoleMenuOpen(false)
                    }}
                    className={`w-full text-left px-3 py-2 flex flex-col hover:bg-warm-50 ${
                      currentRole === r ? 'bg-forest-50/70 font-bold text-forest-900' : 'text-charcoal-700'
                    }`}
                  >
                    <span className="font-medium">{roleLabels[r].label}</span>
                    <span className="text-[10px] text-charcoal-400 font-normal">{roleLabels[r].desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-forest-800 text-white shadow-soft font-semibold'
                    : 'text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-charcoal-500'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && item.badge > 0 ? (
                  <span
                    className={`px-1.5 py-0.5 text-xs font-bold rounded-full ${
                      active ? 'bg-coral-500 text-white' : 'bg-coral-100 text-coral-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-warm-200 bg-warm-50/50 space-y-2">
          <button
            onClick={() => {
              if (confirm('Reset demo database to fresh sample records? Any local changes will be cleared.')) {
                resetToDemoData()
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-charcoal-600 hover:text-forest-800 hover:bg-white rounded-lg border border-warm-300 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Records</span>
          </button>

          <div className="flex items-center justify-between pt-1 text-xs text-charcoal-500">
            <span className="truncate max-w-[130px] font-medium">{currentUser?.full_name || 'Staff User'}</span>
            <button
              onClick={logout}
              className="p-1 text-charcoal-400 hover:text-rose-600"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/20 z-30 md:hidden backdrop-blur-xs"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-warm-200 px-6 py-4 items-center justify-between sticky top-0 z-20">
          <div>
            {title && <h1 className="text-xl font-bold text-charcoal-900 tracking-tight">{title}</h1>}
            {subtitle && <p className="text-xs text-charcoal-500 mt-0.5">{subtitle}</p>}
          </div>

          <div className="flex items-center gap-4">
            {actions}

            {/* Notification Bell Dropdown */}
            <div className="relative">
              <button
                onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                className="p-2 rounded-xl text-charcoal-600 hover:bg-warm-100 hover:text-charcoal-900 relative border border-warm-200"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-coral-500 text-[10px] text-white font-bold flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {notifMenuOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-warm-200 rounded-2xl shadow-soft-lg z-50 overflow-hidden">
                  <div className="p-3.5 bg-warm-50 border-b border-warm-200 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-charcoal-700">Notifications ({unreadNotifs.length} unread)</span>
                    {unreadNotifs.length > 0 && (
                      <button
                        onClick={markAllNotificationsRead}
                        className="text-[11px] text-teal-700 hover:underline font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-warm-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-charcoal-500">
                        No notifications at this time.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-3.5 hover:bg-warm-50 cursor-pointer text-xs transition-colors ${
                            !n.is_read ? 'bg-forest-50/50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            {n.severity === 'critical' ? (
                              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                            ) : n.severity === 'warning' ? (
                              <Bell className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            ) : (
                              <Shield className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold ${n.severity === 'critical' ? 'text-rose-900' : 'text-charcoal-900'}`}>
                                {n.title}
                              </p>
                              <p className="text-charcoal-600 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[10px] text-charcoal-400 mt-1 block">
                                {new Date(n.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-warm-50 border-t border-warm-200 text-center">
                    <Link
                      href="/dashboard/alerts"
                      onClick={() => setNotifMenuOpen(false)}
                      className="text-xs text-forest-800 font-semibold hover:underline"
                    >
                      View All Alerts & Tasks →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Current user badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-warm-200">
              <div className="w-8 h-8 rounded-full bg-forest-100 text-forest-800 font-bold flex items-center justify-center text-xs border border-forest-300">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-xs font-semibold text-charcoal-800 leading-tight">{currentUser?.full_name}</p>
                <p className="text-[10px] text-charcoal-500 capitalize">{roleLabels[currentRole]?.label}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
