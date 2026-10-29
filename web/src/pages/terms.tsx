import React from 'react'
import Head from 'next/head'
import { Shield, FileText } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>Terms of Use — RescueAI</title>
      </Head>

      <Navbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-100 text-forest-900 border border-forest-200 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5 text-forest-700" />
              <span>Terms & Standards</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
              Terms of Use
            </h1>
            <p className="text-xs text-charcoal-500">
              Operational Guidelines for Participating Organisations and Field Workers
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-warm-200 shadow-soft space-y-6 text-sm text-charcoal-700 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">1. Acceptance of Terms</h2>
              <p>
                By accessing or registering with RescueAI, animal welfare NGOs, veterinary polyclinics, municipal bodies, and citizens agree to uphold ethical animal welfare practices in accordance with municipal Animal Birth Control (ABC) standards and WHO Rabies elimination protocols.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">2. Animal Welfare & Identification Protocol</h2>
              <p>
                All registered dog profiles must correspond to actual community or shelter canines. Physical QR collars must be fastened safely with break-away or elastic safety margins to prevent strangulation or injury.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">3. Veterinary Medical Integrity</h2>
              <p>
                Only licensed veterinary doctors (DVM / BVSc) may enter confirmed diagnoses and administer core prescription biologicals (e.g. Nobivac Rabies, DHPPi). Artificial intelligence suggestions are decision-support indicators and do not replace professional physical diagnosis.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">4. Suspected Rabies Escalation</h2>
              <p>
                Any suspected canine rabies exposure flagged in RescueAI requires mandatory notification to the local Municipal Health Officer and immediate 10-day quarantine isolation under authorized supervision.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
