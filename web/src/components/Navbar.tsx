import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { QrCode, Shield, Menu, X, AlertCircle, Heart, ChevronRight, LogOut, User } from 'lucide-react'
import { useRescueAI } from '../lib/store'

export const Navbar: React.FC = () => {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { currentUser, isDemoMode, logout } = useRescueAI()

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'How It Works', href: '/how-it-works' },
    { name: 'Features', href: '/features' },
    { name: 'Scan QR', href: '/scan', highlight: true },
    { name: 'Report Sighting', href: '/report' },
  ]

  const isActive = (href: string) => router.pathname === href

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-warm-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-forest-800 to-teal-700 flex items-center justify-center text-white shadow-soft group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-forest-950">Rescue<span className="text-teal-600">AI</span></span>
                {isDemoMode && (
                  <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                    Demo
                  </span>
                )}
              </div>
              <p className="text-[10px] text-charcoal-500 font-medium tracking-wide hidden sm:block">
                Stray Dog QR & Health Platform
              </p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  link.highlight
                    ? 'text-teal-700 bg-teal-50 hover:bg-teal-100 font-semibold'
                    : isActive(link.href)
                    ? 'text-forest-900 bg-forest-50 font-semibold'
                    : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-warm-100'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Action Buttons — Desktop */}
          <div className="hidden md:flex items-center gap-2">
            {currentUser ? (
              /* Logged In: show user chip + dashboard + logout */
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-50 border border-forest-200 text-xs font-semibold text-forest-900">
                  <User className="w-3.5 h-3.5 text-forest-700" />
                  <span className="hidden lg:inline">{currentUser.full_name.split(' ')[0]}</span>
                  <span className="text-[10px] text-forest-600 capitalize hidden lg:inline">
                    ({currentUser.role.replace('_', ' ')})
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft transition-all"
                >
                  <span>Dashboard</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-charcoal-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              /* Not Logged In: show Login button prominently */
              <>
                <Link
                  href="/scan"
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-forest-900 bg-white border border-forest-300 hover:bg-forest-50 rounded-xl shadow-sm transition-all"
                >
                  <QrCode className="w-4 h-4 text-forest-700" />
                  <span>Scan QR</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft transition-all"
                >
                  <span>Login</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            {!currentUser && (
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-bold text-white bg-forest-800 rounded-lg hover:bg-forest-900"
              >
                Login
              </Link>
            )}
            {currentUser && (
              <Link
                href="/scan"
                className="p-2 text-forest-800 bg-forest-50 rounded-lg hover:bg-forest-100"
                title="Scan QR"
              >
                <QrCode className="w-5 h-5" />
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-charcoal-700 hover:bg-warm-100"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-warm-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {isDemoMode && (
            <div className="px-3 py-1.5 bg-amber-50 text-amber-800 text-xs rounded-lg border border-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Running in Demonstration Mode with sample records.</span>
            </div>
          )}

          {currentUser && (
            <div className="px-3 py-2 bg-forest-50 border border-forest-200 rounded-xl text-xs">
              <p className="font-bold text-forest-900">{currentUser.full_name}</p>
              <p className="text-forest-700 capitalize">{currentUser.role.replace(/_/g, ' ')}</p>
            </div>
          )}

          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg text-base font-medium ${
                  isActive(link.href)
                    ? 'text-forest-900 bg-forest-50 font-semibold'
                    : 'text-charcoal-700 hover:bg-warm-100'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-warm-200 flex flex-col gap-2">
            <Link
              href="/report"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl"
            >
              <Heart className="w-4 h-4" />
              Report Injured Dog
            </Link>

            {currentUser ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-white bg-forest-800 rounded-xl shadow-sm"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-semibold text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 text-sm font-bold text-white bg-forest-800 rounded-xl shadow-sm"
              >
                Login / Sign Up
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
