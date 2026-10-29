import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  QrCode,
  Syringe,
  Stethoscope,
  Activity,
  MapPin,
  Sparkles,
  AlertTriangle,
  Heart,
  Users,
  ChevronRight,
  Shield,
  FileSpreadsheet,
  Check
} from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export default function FeaturesPage() {
  const featureList = [
    {
      title: 'QR-Based Dog Identification',
      category: 'Core Hardware & Tagging',
      icon: QrCode,
      color: 'bg-forest-100 text-forest-800',
      desc: 'Each registered dog receives a unique, unalterable digital identity (e.g. RAI-DOG-0001). The system automatically formats high-resolution QR collar medallions, printable on circular or rectangular plates with engraved IDs.',
      bullets: [
        'Deterministic profile routes without database bloating',
        'Physical collar print layout with punch-hole guides',
        'Emergency phone and NGO helpline integration',
      ],
      link: '/dashboard/dogs',
      cta: 'View Dog Registry',
    },
    {
      title: 'Vaccination Management & Duplicate Prevention',
      category: 'Public Health & Rabies',
      icon: Syringe,
      color: 'bg-teal-100 text-teal-800',
      desc: 'Track core Rabies and DHPP vaccines with dose quantities, manufacturer batch numbers, and veterinarian signatures. The system cross-references previous records to prevent repeat immunizations.',
      bullets: [
        'Automated 60-day duplicate vaccination detection',
        'Status classification: Vaccinated, Due Soon, Overdue',
        'Full chronological vaccination certificate history',
      ],
      link: '/dashboard/vaccinations',
      cta: 'Manage Vaccinations',
    },
    {
      title: 'Veterinary Medical Records',
      category: 'Clinical Care',
      icon: Stethoscope,
      color: 'bg-blue-100 text-blue-800',
      desc: 'Veterinarians log formal physical examinations, injuries, suspected conditions, confirmed diagnoses, and recovery milestones. Includes critical isolation notices for suspected rabies exposures.',
      bullets: [
        'Injury, infection, dermatological & surgical categorization',
        'Rabies quarantine escalation with public health protocol',
        'Treatment notes and follow-up appointment tracking',
      ],
      link: '/dashboard/medical',
      cta: 'Open Medical Records',
    },
    {
      title: 'Activity & Vitals Monitoring',
      category: 'Field Health Observations',
      icon: Activity,
      color: 'bg-emerald-100 text-emerald-800',
      desc: 'Field teams log physical measurements—temperature, heart rate, weight, and mobility—during community visits. Charts reflect recovery progress without making false IoT collar claims.',
      bullets: [
        'Transparent manual observation records',
        'Weight trend and temperature tracking over time',
        'Triage levels: Normal, Needs Attention, Urgent',
      ],
      link: '/dashboard/activity',
      cta: 'View Vitals Timeline',
    },
    {
      title: 'GPS Sightings & Territory Mapping',
      category: 'Geospatial Intelligence',
      icon: MapPin,
      color: 'bg-coral-100 text-coral-800',
      desc: 'Interactive Leaflet OpenStreetMap displaying recorded dog sightings, pack territories, and vaccination campaign clinics across urban municipal sectors.',
      bullets: [
        'Filter by vaccination status and medical priority',
        'Direct links from map pins to digital health profiles',
        'Geolocation capture for citizen sighting reports',
      ],
      link: '/dashboard/map',
      cta: 'Explore Map',
    },
    {
      title: 'AI-Assisted Photo Identification & Matching',
      category: 'Machine Learning',
      icon: Sparkles,
      color: 'bg-amber-100 text-amber-800',
      desc: 'Upload a stray dog photograph to compute visual feature matches (coat color, ear structure, facial blaze, size). Produces similarity ranking to help field teams find existing profiles.',
      bullets: [
        'Multi-attribute similarity scoring (%)',
        'Potential duplicate dog detection across territories',
        'Human-in-the-loop verification before record updates',
      ],
      link: '/dashboard/ai',
      cta: 'Test AI Matcher',
    },
  ]

  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>Features & Architecture — RescueAI</title>
      </Head>

      <Navbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Capabilities Matrix</span>
            <h1 className="text-3xl sm:text-5xl font-black text-forest-950 tracking-tight leading-tight">
              Comprehensive Tools for Animal Welfare Teams
            </h1>
            <p className="text-base text-charcoal-600 leading-relaxed">
              RescueAI combines field-ready hardware tags, clinical veterinary tracking, and explainable AI analytics into a single cohesive platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featureList.map((f, i) => {
              const Icon = f.icon
              return (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-7 border border-warm-200 shadow-soft flex flex-col justify-between hover:shadow-soft-lg transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center shadow-2xs`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                        {f.category}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-charcoal-900">{f.title}</h2>
                    <p className="text-xs text-charcoal-600 leading-relaxed">{f.desc}</p>

                    <div className="space-y-2 pt-2 border-t border-warm-100">
                      {f.bullets.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2 text-xs text-charcoal-700">
                          <Check className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6">
                    <Link
                      href={f.link}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-900 hover:text-teal-700 transition-colors"
                    >
                      <span>{f.cta}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
