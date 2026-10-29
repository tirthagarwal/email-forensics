import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import {
  Camera,
  Upload,
  Search,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  QrCode,
  Shield,
  ArrowRight
} from 'lucide-react'
import { useRescueAI } from '../lib/store'

interface QRScannerComponentProps {
  onSuccess?: (dogId: string) => void
  destinationMode?: 'public' | 'dashboard'
}

export const QRScannerComponent: React.FC<QRScannerComponentProps> = ({
  onSuccess,
  destinationMode = 'public',
}) => {
  const router = useRouter()
  const { dogs, getDogByDogId } = useRescueAI()

  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera')
  const [manualQuery, setManualQuery] = useState('')
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const html5QrCodeRef = useRef<any>(null)
  const scannerContainerId = 'qr-reader-container'

  // Extract dogId from scanned QR string
  // Supports full URL e.g. "https://rescueai.org/dog/RAI-DOG-0001" or plain "RAI-DOG-0001" or "TAG-RAI-0001"
  const extractDogId = (qrText: string): string => {
    try {
      if (qrText.includes('/dog/')) {
        const parts = qrText.split('/dog/')
        return parts[1].replace(/[/?#].*$/, '').trim()
      }
      // Check if it's a tag ID e.g. TAG-RAI-0001
      const matchingDog = dogs.find(
        (d) =>
          d.qr_tag_id.toLowerCase() === qrText.toLowerCase() ||
          d.dog_id.toLowerCase() === qrText.toLowerCase()
      )
      if (matchingDog) return matchingDog.dog_id

      return qrText.trim()
    } catch {
      return qrText.trim()
    }
  }

  const handleScanSuccess = (decodedText: string) => {
    const dogId = extractDogId(decodedText)
    setScanResult(dogId)
    stopCamera()

    if (onSuccess) {
      onSuccess(dogId)
      return
    }

    // Check if dog exists
    const dog = getDogByDogId(dogId)
    const targetUrl =
      destinationMode === 'dashboard'
        ? `/dashboard/dogs/${dog ? dog.dog_id : dogId}`
        : `/dog/${dog ? dog.dog_id : dogId}`

    setIsProcessing(true)
    setTimeout(() => {
      router.push(targetUrl)
    }, 800)
  }

  // Start Camera with html5-qrcode
  const startCamera = async () => {
    setCameraError(null)
    setScanning(true)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')

      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop()
        } catch {
          // ignore
        }
      }

      const qrScanner = new Html5Qrcode(scannerContainerId)
      html5QrCodeRef.current = qrScanner

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      }

      await qrScanner.start(
        { facingMode: 'environment' }, // Rear camera on mobile
        config,
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          // parse error per frame - normal
        }
      )
    } catch (err: any) {
      console.warn('Camera start error:', err)
      setScanning(false)
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser or use image upload / manual search below.')
      } else if (err?.name === 'NotFoundError' || err?.message?.includes('devices')) {
        setCameraError('No camera found on this device. Please use the image upload or manual search option.')
      } else {
        setCameraError('Unable to start live camera stream. You can upload a photo of the QR collar or search by Dog ID.')
      }
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop()
        html5QrCodeRef.current = null
      } catch (e) {
        // ignore
      }
    }
    setScanning(false)
  }

  useEffect(() => {
    if (activeTab === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [activeTab])

  // File Upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCameraError(null)
    setIsProcessing(true)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const qrScanner = new Html5Qrcode(scannerContainerId)
      const decodedText = await qrScanner.scanFile(file, true)
      handleScanSuccess(decodedText)
    } catch (err) {
      setIsProcessing(false)
      setCameraError('No valid QR code was detected in the uploaded image. Please ensure the QR tag is clearly visible and well-lit.')
    }
  }

  // Manual ID submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualQuery.trim()) return
    handleScanSuccess(manualQuery.trim())
  }

  return (
    <div className="bg-white rounded-3xl border border-warm-200 p-6 sm:p-8 shadow-soft max-w-xl mx-auto">
      {/* Scanner Mode Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-warm-100 rounded-2xl mb-6">
        <button
          onClick={() => setActiveTab('camera')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'camera'
              ? 'bg-white text-forest-900 shadow-soft'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <Camera className="w-4 h-4 text-forest-700" />
          <span>Live Camera</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'upload'
              ? 'bg-white text-forest-900 shadow-soft'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <Upload className="w-4 h-4 text-teal-700" />
          <span>Upload Photo</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            activeTab === 'manual'
              ? 'bg-white text-forest-900 shadow-soft'
              : 'text-charcoal-600 hover:text-charcoal-900'
          }`}
        >
          <Search className="w-4 h-4 text-coral-600" />
          <span>Manual Search</span>
        </button>
      </div>

      {/* Camera Error Message */}
      {cameraError && (
        <div className="p-4 mb-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Camera Notice</p>
            <p className="leading-relaxed">{cameraError}</p>
            <div className="pt-1 flex gap-2">
              <button
                onClick={startCamera}
                className="underline font-semibold text-rose-900"
              >
                Retry Camera
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveTab('manual')}
                className="underline font-semibold text-rose-900"
              >
                Try Quick Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {scanResult && (
        <div className="p-4 mb-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-900 flex items-center gap-3 animate-pulse-subtle">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold">Collar QR Code Recognized!</p>
            <p className="text-[11px] text-emerald-700">Opening digital record for: <strong className="font-mono">{scanResult}</strong>...</p>
          </div>
        </div>
      )}

      {/* TAB 1: LIVE CAMERA */}
      {activeTab === 'camera' && (
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden bg-charcoal-950 aspect-square flex flex-col items-center justify-center border-2 border-forest-800/40">
            {/* HTML5 QR Container */}
            <div id={scannerContainerId} className="w-full h-full"></div>

            {/* Viewfinder Target graphic overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-60 h-60 border-2 border-forest-400 rounded-3xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]">
                {/* Corner Accents */}
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-forest-400 rounded-tl-xl"></span>
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-forest-400 rounded-tr-xl"></span>
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-forest-400 rounded-bl-xl"></span>
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-forest-400 rounded-br-xl"></span>

                {/* Animated horizontal scanner bar */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-forest-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>

          <p className="text-xs text-charcoal-500 text-center flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-forest-700" />
            <span>Point camera at the QR medallion attached to the dog's collar</span>
          </p>
        </div>
      )}

      {/* TAB 2: UPLOAD IMAGE */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-warm-300 hover:border-forest-600 rounded-3xl cursor-pointer bg-warm-50/50 hover:bg-forest-50/30 transition-all p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center mb-3 shadow-2xs">
              <Upload className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-charcoal-800">
              Select or Drop an image with the collar QR
            </p>
            <p className="text-xs text-charcoal-500 mt-1">
              Supports JPEG, PNG, WebP photos taken on mobile
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <p className="text-xs text-charcoal-400 text-center">
            Tip: Ensure the QR tag is not obscured by fur or heavy shadow.
          </p>
        </div>
      )}

      {/* TAB 3: MANUAL SEARCH */}
      {activeTab === 'manual' && (
        <div className="space-y-6">
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-charcoal-700 uppercase tracking-wide">
              Enter RescueAI Dog ID or Collar Tag ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="e.g. RAI-DOG-0001 or TAG-RAI-0001"
                className="flex-1 px-4 py-3 rounded-xl border border-warm-300 text-charcoal-900 font-mono text-sm placeholder-charcoal-400 focus:outline-none focus:ring-2 focus:ring-forest-600"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-forest-800 hover:bg-forest-900 text-white rounded-xl text-sm font-bold shadow-soft transition-all flex items-center gap-1.5"
              >
                <span>Find Dog</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Quick Demo Pickers for Test Convenience */}
          <div className="pt-4 border-t border-warm-200">
            <p className="text-xs font-bold text-charcoal-700 uppercase tracking-wider mb-2.5">
              Quick Test Dogs (Demonstration Records):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {dogs.slice(0, 6).map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => handleScanSuccess(dog.dog_id)}
                  className="flex items-center gap-2 p-2 rounded-xl border border-warm-200 hover:border-forest-500 hover:bg-forest-50/50 text-left transition-all group"
                >
                  <img
                    src={dog.photo_url}
                    alt={dog.name}
                    className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-charcoal-900 truncate group-hover:text-forest-900">
                      {dog.name}
                    </p>
                    <p className="font-mono text-[10px] text-charcoal-500 truncate">
                      {dog.dog_id}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
