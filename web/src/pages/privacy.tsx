import React from 'react'
import Head from 'next/head'
import { Shield, Lock, Eye, CheckCircle2 } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>Privacy Policy — RescueAI</title>
      </Head>

      <Navbar />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-100 text-forest-900 border border-forest-200 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-forest-700" />
              <span>Data Ethics & Privacy</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
              RescueAI Privacy Policy
            </h1>
            <p className="text-xs text-charcoal-500">
              Last updated: October 2026 • Version 2.4
            </p>
          </div>

          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-warm-200 shadow-soft space-y-6 text-sm text-charcoal-700 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">1. Core Privacy Philosophy</h2>
              <p>
                RescueAI exists to protect canine welfare and promote public health through rabies tracking. We adhere strictly to the principle of data minimization: public QR scans expose only the minimum necessary animal health data required to confirm immunization and welfare status.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">2. What Information is Public vs Restricted</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-700" />
                    Publicly Visible on QR Scan:
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-emerald-950">
                    <li>Dog Name or temporary identifier</li>
                    <li>RescueAI Dog ID and Tag ID</li>
                    <li>Current vaccination status and expiration dates</li>
                    <li>General neighborhood / designated territory</li>
                    <li>Managing animal welfare NGO contact number</li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                  <span className="font-bold text-rose-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-rose-700" />
                    Strictly Restricted to Authorized Staff:
                  </span>
                  <ul className="list-disc pl-5 space-y-1 text-rose-950">
                    <li>Citizen reporter phone numbers and emails</li>
                    <li>Internal volunteer and rescuer notes</li>
                    <li>Exact private residential coordinates</li>
                    <li>Confidential clinical veterinary diagnostic logs</li>
                    <li>User credentials and system audit trails</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">3. Citizen Sighting Submissions</h2>
              <p>
                When you submit a sighting or injury report, your phone number or email is collected strictly for field dispatch follow-up. We never sell, rent, or share personal contact details with commercial third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-charcoal-900">4. QR Collar Tags & GPS Privacy</h2>
              <p>
                The physical collar tag contains only a high-contrast QR code pointing to a deterministic public web URL (e.g. <code>https://rescueai.org/dog/RAI-DOG-0001</code>). The collar does not contain GPS transceivers, SIM cards, or continuous live location tracking devices.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
