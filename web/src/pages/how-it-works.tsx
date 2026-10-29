import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Shield,
  QrCode,
  Tag,
  Stethoscope,
  Heart,
  Syringe,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  AlertTriangle
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Digital Dog Profile Registration',
      subtitle: 'Create the immutable identity record',
      desc: 'When an animal welfare NGO or municipal worker encounters an unregistered stray dog, they create a permanent digital record in RescueAI. The profile includes photos from multiple angles, physical color markings, sterilisation status, estimated age, and primary territory.',
      points: [
        'Automatic unique ID generation (e.g. RAI-DOG-0001)',
        'Territory geolocation coordinate mapping',
        'Duplicate detection against existing entries',
      ],
      icon: QrCode,
      color: 'bg-forest-100 text-forest-800 border-forest-200',
    },
    {
      num: '02',
      title: 'Collar Medallion Tagging',
      subtitle: 'Physical tag linked to stable digital URL',
      desc: 'RescueAI generates an encrypted, high-contrast QR code pointing to the dog’s stable public web profile. The tag is printed onto an anodized aluminum medallion or high-visibility collar strap designed for all-weather outdoor durability.',
      points: [
        'Standard circular and rectangular collar formats',
        'Built-in emergency helpline and dog ID engraving',
        'QR encodes web URL, not entire medical database',
      ],
      icon: Tag,
      color: 'bg-teal-100 text-teal-800 border-teal-200',
    },
    {
      num: '03',
      title: 'Field Scanning by Citizens & Vets',
      subtitle: 'Universal access on any smartphone',
      desc: 'Anyone who encounters the dog—a concerned resident, veterinarian, or animal control officer—can simply point their phone camera at the medallion. No mobile app download or password is required.',
      points: [
        'Instant mobile-optimized outdoor health summary',
        'Clear rabies immunity validity dates',
        'Zero exposure of sensitive volunteer personal info',
      ],
      icon: Stethoscope,
      color: 'bg-coral-100 text-coral-800 border-coral-200',
    },
    {
      num: '04',
      title: 'Ongoing Health & Rabies Tracking',
      subtitle: 'Continuous care coordination',
      desc: 'Veterinarians log clinical visits, medication regimens, and vaccine batches. If a citizen spots an injury, they submit an alert that dispatches nearby rescue personnel, keeping community animals protected.',
      points: [
        'Duplicate vaccination prevention warnings',
        'Automatic 30-day and 14-day booster reminders',
        'Quarantine escalation protocol for suspected rabies',
      ],
      icon: Syringe,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
  ]

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>How RescueAI Works — Stray Dog QR Health Platform</title>
      </Head>

      <Navbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 sm:mb-20">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Architecture & Field Workflow</span>
            <h1 className="text-3xl sm:text-5xl font-black text-forest-950 tracking-tight leading-tight">
              From Physical Collar to Digital Care
            </h1>
            <p className="text-base text-charcoal-600 leading-relaxed">
              Explore how RescueAI connects physical identification with digital vaccination records, preventing repeat doses and uniting community stakeholders.
            </p>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-12 max-w-4xl mx-auto">
            {steps.map((s, idx) => {
              const Icon = s.icon
              return (
                <div
                  key={s.num}
                  className="bg-white rounded-3xl p-8 sm:p-10 border border-warm-200 shadow-soft relative overflow-hidden flex flex-col sm:flex-row gap-6 sm:gap-8 items-start"
                >
                  <div className={`w-16 h-16 rounded-2xl ${s.color} border flex items-center justify-center flex-shrink-0 shadow-2xs`}>
                    <Icon className="w-8 h-8" />
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-teal-700 uppercase tracking-widest">
                        Step {s.num}
                      </span>
                      <span className="text-charcoal-300">•</span>
                      <span className="text-xs font-medium text-charcoal-500">{s.subtitle}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-charcoal-900 tracking-tight">
                      {s.title}
                    </h2>

                    <p className="text-sm text-charcoal-600 leading-relaxed">
                      {s.desc}
                    </p>

                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-charcoal-700">
                      {s.points.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Interactive Callout */}
          <div className="mt-16 text-center max-w-xl mx-auto space-y-4">
            <h3 className="text-xl font-bold text-forest-950">Test the System Now</h3>
            <p className="text-xs text-charcoal-600">
              Try scanning a demo dog QR code or open the field dashboard to register a new stray dog profile.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link
                href="/scan"
                className="px-5 py-2.5 bg-forest-800 text-white rounded-xl text-sm font-semibold hover:bg-forest-900 shadow-soft"
              >
                Scan a Dog QR
              </Link>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 bg-white border border-warm-300 text-charcoal-800 rounded-xl text-sm font-semibold hover:bg-warm-100"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
