import React, { useState, useRef, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, Download, Copy, Check, Shield, AlertCircle } from 'lucide-react'
import { Dog } from '../lib/types'

interface PrintableCollarTagProps {
  dog: Dog
  onClose?: () => void
}

export const PrintableCollarTag: React.FC<PrintableCollarTagProps> = ({ dog, onClose }) => {
  const [tagFormat, setTagFormat] = useState<'round' | 'rect' | 'compact'>('round')
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('https://rescueai.org')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }
  }, [])

  const profileUrl = `${origin}/dog/${dog.dog_id}`

  const handleCopyLink = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(profileUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-warm-200 p-6 shadow-soft max-w-xl mx-auto">
      {/* Format selector */}
      <div className="no-print flex items-center justify-between pb-4 border-b border-warm-200 mb-6">
        <div>
          <h3 className="font-bold text-charcoal-900 text-base">QR Collar Tag Generator</h3>
          <p className="text-xs text-charcoal-500">Official digital identity tag for {dog.name} ({dog.dog_id})</p>
        </div>

        <div className="flex items-center gap-1 bg-warm-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setTagFormat('round')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              tagFormat === 'round' ? 'bg-white text-forest-900 shadow-2xs' : 'text-charcoal-600'
            }`}
          >
            Circular Medallion
          </button>
          <button
            onClick={() => setTagFormat('rect')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              tagFormat === 'rect' ? 'bg-white text-forest-900 shadow-2xs' : 'text-charcoal-600'
            }`}
          >
            Rectangular Tag
          </button>
        </div>
      </div>

      {/* The Printable Tag Area */}
      <div className="printable-area flex flex-col items-center justify-center p-4">
        {tagFormat === 'round' ? (
          // Circular Medallion (50mm Physical Spec)
          <div className="w-72 h-72 rounded-full border-4 border-forest-900 bg-white p-5 flex flex-col items-center justify-between text-center relative shadow-sm">
            {/* Punch hole guide */}
            <div className="w-4 h-4 rounded-full border-2 border-dashed border-charcoal-400 absolute top-2 left-1/2 -translate-x-1/2 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-charcoal-400"></span>
            </div>

            {/* Top Brand */}
            <div className="pt-2 flex items-center gap-1 text-forest-900">
              <Shield className="w-3.5 h-3.5 fill-forest-900" />
              <span className="text-[11px] font-black uppercase tracking-wider">RescueAI Canine ID</span>
            </div>

            {/* QR Code */}
            <div className="bg-white p-2 border border-charcoal-200 rounded-lg shadow-2xs my-1">
              <QRCodeSVG
                value={profileUrl}
                size={120}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Dog ID & Instruction */}
            <div className="space-y-0.5">
              <p className="font-mono text-sm font-black text-charcoal-950 tracking-wider">
                {dog.dog_id}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-teal-700">
                Scan For Health Record
              </p>
              <p className="text-[8px] text-charcoal-500 font-medium">
                Helpline: +1 (800) 555-PAWS
              </p>
            </div>
          </div>
        ) : (
          // Rectangular Collar Plate (70mm x 45mm Spec)
          <div className="w-80 h-48 rounded-2xl border-4 border-forest-900 bg-white p-4 flex items-center justify-between text-left relative shadow-sm">
            {/* Rivet holes left and right */}
            <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-charcoal-400 absolute top-1/2 -translate-y-1/2 left-2"></div>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-dashed border-charcoal-400 absolute top-1/2 -translate-y-1/2 right-2"></div>

            {/* Left QR */}
            <div className="pl-3">
              <div className="bg-white p-2 border border-charcoal-200 rounded-lg shadow-2xs">
                <QRCodeSVG
                  value={profileUrl}
                  size={105}
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {/* Right Information */}
            <div className="flex-1 pl-4 pr-3 flex flex-col justify-between h-full py-1">
              <div>
                <div className="flex items-center gap-1 text-forest-900 mb-1">
                  <Shield className="w-3.5 h-3.5 fill-forest-900" />
                  <span className="text-[10px] font-black uppercase tracking-wider">RescueAI Tag</span>
                </div>
                <p className="font-mono text-base font-black text-charcoal-950">
                  {dog.dog_id}
                </p>
                <p className="text-xs font-bold text-forest-800">
                  {dog.name}
                </p>
              </div>

              <div className="border-t border-warm-200 pt-1 space-y-0.5">
                <p className="text-[9px] font-bold text-teal-700 uppercase tracking-wide">
                  Scan to View Health Record
                </p>
                <p className="text-[8px] text-charcoal-500 font-medium leading-tight">
                  Tag: {dog.qr_tag_id} | Emergency: 800-555-PAWS
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Physical Tag Specification Label */}
        <p className="text-[10px] text-charcoal-400 text-center mt-3 no-print">
          Scale 100% for physical tag print • Cut along outer solid border • Punch indicated collar strap hole
        </p>
      </div>

      {/* Action Buttons (no-print) */}
      <div className="no-print mt-6 pt-4 border-t border-warm-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-charcoal-700 bg-warm-100 hover:bg-warm-200 rounded-xl transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Link Copied' : 'Copy Public URL'}</span>
          </button>
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-teal-700 hover:underline"
          >
            Preview Public Page →
          </a>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-charcoal-600 hover:bg-warm-100 rounded-xl"
            >
              Close
            </button>
          )}
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Collar Tag</span>
          </button>
        </div>
      </div>
    </div>
  )
}
