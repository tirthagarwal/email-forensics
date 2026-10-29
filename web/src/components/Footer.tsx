import React from 'react'
import Link from 'next/link'
import { Shield, Heart, QrCode, Phone, Mail, MapPin } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="bg-warm-100 border-t border-warm-200 text-charcoal-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-forest-800 flex items-center justify-center text-white shadow-sm">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-forest-950">
                Rescue<span className="text-teal-600">AI</span>
              </span>
            </Link>
            <p className="text-sm text-charcoal-600 max-w-sm leading-relaxed">
              Every Dog Has a Story. Every Life Deserves Care. AI-powered stray dog identification, vaccination management, and digital health records through QR-coded collars.
            </p>
            <div className="pt-2 text-xs text-charcoal-500 space-y-1">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-forest-700" /> Metro Animal Welfare Operations Hub, Civic Center
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-forest-700" /> Stray Dog Emergency Helpline: +1 (800) 555-PAWS
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-forest-700" /> support@rescueai.org
              </p>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-4">Platform</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/how-it-works" className="hover:text-forest-800 transition-colors">How It Works</Link></li>
              <li><Link href="/features" className="hover:text-forest-800 transition-colors">Core Features</Link></li>
              <li><Link href="/scan" className="hover:text-forest-800 transition-colors flex items-center gap-1.5"><QrCode className="w-3.5 h-3.5 text-teal-600" /> Scan QR Collar</Link></li>
              <li><Link href="/report" className="hover:text-forest-800 transition-colors flex items-center gap-1.5"><Heart className="w-3.5 h-3.5 text-coral-600" /> Report Sighting</Link></li>
              <li><Link href="/login" className="hover:text-forest-800 transition-colors">Staff Portal</Link></li>
            </ul>
          </div>

          {/* Stakeholders */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-4">Stakeholders</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/login" className="hover:text-forest-800 transition-colors">Animal Welfare NGOs</Link></li>
              <li><Link href="/login" className="hover:text-forest-800 transition-colors">Veterinarians & Clinics</Link></li>
              <li><Link href="/login" className="hover:text-forest-800 transition-colors">Municipal Authorities</Link></li>
              <li><Link href="/dashboard/ai" className="hover:text-forest-800 transition-colors">AI & Hotspot Analysis</Link></li>
              <li><Link href="/dashboard/analytics" className="hover:text-forest-800 transition-colors">Vaccination Coverage Reports</Link></li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 mb-4">Legal & Ethics</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/privacy" className="hover:text-forest-800 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-forest-800 transition-colors">Terms of Service</Link></li>
              <li><span className="text-xs text-charcoal-500">Animal Birth Control (ABC) Guidelines</span></li>
              <li><span className="text-xs text-charcoal-500">Rabies Elimination Goal 2030</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-warm-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-charcoal-500">
          <p>© {new Date().getFullYear()} RescueAI Animal Welfare Systems. All rights reserved.</p>
          <p className="text-center sm:text-right text-[11px] max-w-md text-charcoal-400">
            Notice: All metrics shown in demonstration mode are illustrative sample data. QR tags contain stable profile URLs and do not store live GPS or personal reporter data.
          </p>
        </div>
      </div>
    </footer>
  )
}
