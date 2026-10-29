import React from 'react'
import Head from 'next/head'
import Link from 'next/head'
import { QrCode, Shield, Info, HelpCircle } from 'lucide-react'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import { QRScannerComponent } from '../components/QRScannerComponent'

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-warm-50 flex flex-col">
      <Head>
        <title>Scan Stray Dog QR Collar — RescueAI</title>
        <meta
          name="description"
          content="Scan a RescueAI collar medallion to view a stray dog's digital health record, vaccination history, and care instructions."
        />
      </Head>

      <Navbar />

      <main className="flex-1 py-10 sm:py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-forest-100 text-forest-900 border border-forest-200 text-xs font-semibold">
              <QrCode className="w-3.5 h-3.5 text-forest-700" />
              <span>RescueAI Instant Scanner</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-forest-950 tracking-tight">
              Scan a Dog's QR Collar Tag
            </h1>
            <p className="text-sm text-charcoal-600 max-w-md mx-auto leading-relaxed">
              Point your phone camera at the medallion or upload a photograph to immediately view the dog's vaccination and health status.
            </p>
          </div>

          {/* Scanner Component */}
          <QRScannerComponent destinationMode="public" />

          {/* Helpful Instructions */}
          <div className="mt-8 bg-white rounded-2xl border border-warm-200 p-5 text-xs text-charcoal-600 space-y-3">
            <div className="flex items-center gap-2 font-bold text-charcoal-900">
              <Info className="w-4 h-4 text-teal-700" />
              <span>Scanning Tips for Field Use:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-charcoal-600 leading-relaxed">
              <li>Keep the phone steady at a distance of 10–20 cm from the collar medallion.</li>
              <li>If the dog is moving, take a steady photograph with your default camera and use the <strong>Upload Photo</strong> tab above.</li>
              <li>Every registered tag has the dog's ID engraved on the back (e.g. <code>RAI-DOG-0001</code>). You can always search this ID manually.</li>
              <li>No mobile app or login is required to scan and view public medical records.</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
