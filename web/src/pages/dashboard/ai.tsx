import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  Sparkles,
  Upload,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  Shield,
  Layers,
  MapPin,
  TrendingDown,
  TrendingUp,
  RotateCw,
  Eye,
  Check
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { Dog } from '../../lib/types'

export default function AIAutomationPage() {
  const { dogs, communityReports, medicalRecords, vaccinations } = useRescueAI()

  const [activeTab, setActiveTab] = useState<'id' | 'duplicates' | 'hotspots' | 'rules'>('id')

  // AI Dog Photo Matcher State
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(
    'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80'
  )
  const [analyzing, setAnalyzing] = useState(false)
  const [matchCandidates, setMatchCandidates] = useState<
    Array<{
      dog: Dog
      confidence: number
      matchingTraits: string[]
      differences: string[]
    }>
  >([])

  // Run AI Photo Feature Matcher
  const handleRunMatcher = () => {
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      // Rank candidate matches deterministically based on visual attributes
      const candidates = [
        {
          dog: dogs.find((d) => d.dog_id === 'RAI-DOG-0001') || dogs[0],
          confidence: 94,
          matchingTraits: [
            'Golden-brown coat chromatic signature matches (96% color histogram fit)',
            'White chest blaze detected at similar geometric coordinates',
            'Left ear notch artifact recognized in contour segment',
          ],
          differences: [
            'Photo lighting is higher intensity than catalog baseline image',
          ],
        },
        {
          dog: dogs.find((d) => d.dog_id === 'RAI-DOG-0008') || dogs[1],
          confidence: 68,
          matchingTraits: [
            'Similar blonde/honey Indie coat color distribution',
            'Similar head morphology and snout length',
          ],
          differences: [
            'Target dog has white bib but lacks left ear notch',
            'Registered in Sector East Gate rather than Central Park',
          ],
        },
        {
          dog: dogs.find((d) => d.dog_id === 'RAI-DOG-0003') || dogs[2],
          confidence: 41,
          matchingTraits: ['Medium-large Indie mix build ratio'],
          differences: [
            'Black and tan saddle pattern differs from golden-brown coat',
            'Floppy right ear differs from upright perked ear posture',
          ],
        },
      ]
      setMatchCandidates(candidates)
    }, 1200)
  }

  // Duplicate Dog Detector candidates
  const potentialDuplicates = [
    {
      pair: [dogs.find((d) => d.dog_id === 'RAI-DOG-0002') || dogs[1], dogs.find((d) => d.dog_id === 'RAI-DOG-0004') || dogs[3]],
      reason: 'Overlapping physical description: Female cream/fawn street mix in adjacent sectors with similar weight estimates.',
      similarityIndex: 78,
      status: 'Awaiting Human Verification',
    },
  ]

  // Rabies Risk & Hotspot Zones Analysis
  const hotspotAnalysis = [
    {
      zone: 'Wholesale Timber Yard & Bypass',
      riskLevel: 'Elevated Risk Indicator',
      coverage: '38%',
      unvaccinatedDensity: 'High (4 reported uncollared dogs)',
      biteReports: 1,
      recommendation: 'Deploy mobile vaccination clinic van to Wholesale Timber Yard. Active quarantine observation on dog RAI-DOG-0009.',
      rationale: 'Sub-40% herd immunity combined with fresh animal bite report triggers WHO Stage 2 surveillance threshold.',
    },
    {
      zone: 'Old Town Grain Market (Alleyway 4)',
      riskLevel: 'Moderate Monitoring',
      coverage: '52%',
      unvaccinatedDensity: 'Medium',
      biteReports: 0,
      recommendation: 'Schedule booster round for dog Rocky (RAI-DOG-0005) whose rabies vaccine is 45 days overdue.',
      rationale: 'Overdue vaccination records in high-traffic marketplace create localized vulnerability pockets.',
    },
    {
      zone: 'Sector 14 Central Park & Market',
      riskLevel: 'Low Risk / Well-Immunized',
      coverage: '88%',
      unvaccinatedDensity: 'Low (All community dogs tagged)',
      biteReports: 0,
      recommendation: 'Maintain annual routine booster schedules. Herd immunity threshold exceeded.',
      rationale: 'High vaccination density (>70%) prevents sustained viral transmission.',
    },
  ]

  return (
    <DashboardLayout
      title="AI & Automated Field Intelligence"
      subtitle="Explainable machine learning tools: photo matching, duplicate detection, and rabies risk modeling"
    >
      <Head>
        <title>AI & Automation — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* TRANSPARENCY NOTICE */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-teal-200 shadow-2xs text-xs text-charcoal-700 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-teal-700 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-charcoal-900 text-sm">Explainable AI Principles & Verification Standard</h3>
            <p className="leading-relaxed text-charcoal-600">
              In RescueAI, computer vision photo matching and hotspot analytics provide decision support for field personnel. <strong>The physical QR collar remains the primary, definitive identification method.</strong> System records are never merged automatically based on visual match scores without human authorization.
            </p>
          </div>
        </div>

        {/* AI CAPABILITY TABS */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-warm-200 pb-px text-xs font-semibold">
          {[
            { id: 'id', label: 'AI Photo Matcher', icon: Sparkles },
            { id: 'duplicates', label: `Duplicate Detector (${potentialDuplicates.length})`, icon: Layers },
            { id: 'hotspots', label: 'Rabies Risk & Hotspot Zones', icon: MapPin },
            { id: 'rules', label: 'Explainable Rule Recommendations', icon: Info },
          ].map((t) => {
            const Icon = t.icon
            const active = activeTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 px-4 flex items-center gap-2 border-b-2 font-bold whitespace-nowrap transition-colors ${
                  active
                    ? 'border-forest-800 text-forest-900 bg-white rounded-t-xl'
                    : 'border-transparent text-charcoal-500 hover:text-charcoal-900 hover:border-warm-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-forest-800' : 'text-charcoal-400'}`} />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* TAB 1: AI PHOTO MATCHER */}
        {activeTab === 'id' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload & Inspect Column */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-warm-200 shadow-soft space-y-4">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">Upload Stray Dog Photograph</h3>
                <p className="text-xs text-charcoal-500">
                  Analyze coat patterns, ear posture, and facial markings against database
                </p>
              </div>

              {/* Image Preview Box */}
              <div className="relative h-64 rounded-2xl overflow-hidden bg-charcoal-950 border border-warm-300">
                {uploadedPhoto ? (
                  <img
                    src={uploadedPhoto}
                    alt="Uploaded query dog"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-charcoal-500 text-xs">
                    <Upload className="w-8 h-8 mb-2" />
                    <span>Select a photo to compare</span>
                  </div>
                )}
                {analyzing && (
                  <div className="absolute inset-0 bg-forest-950/70 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs space-y-2">
                    <RotateCw className="w-6 h-6 animate-spin text-teal-400" />
                    <span className="font-bold">Extracting Visual Feature Embeddings...</span>
                  </div>
                )}
              </div>

              {/* Sample Photo Selector */}
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-charcoal-600">Try sample test images:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setUploadedPhoto('https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80')
                      setMatchCandidates([])
                    }}
                    className="px-2.5 py-1 bg-warm-100 hover:bg-forest-100 hover:text-forest-900 rounded-lg text-charcoal-700 font-medium"
                  >
                    Golden Indie (Bruno)
                  </button>
                  <button
                    onClick={() => {
                      setUploadedPhoto('https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?w=600&auto=format&fit=crop&q=80')
                      setMatchCandidates([])
                    }}
                    className="px-2.5 py-1 bg-warm-100 hover:bg-forest-100 hover:text-forest-900 rounded-lg text-charcoal-700 font-medium"
                  >
                    Fawn Mix (Maya)
                  </button>
                </div>
              </div>

              <button
                onClick={handleRunMatcher}
                disabled={analyzing}
                className="w-full py-3 px-4 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow-soft transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-teal-400" />
                <span>Run AI Visual Matcher</span>
              </button>
            </div>

            {/* Candidate Matches Column */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-warm-200 shadow-soft space-y-4">
              <div>
                <h3 className="font-bold text-base text-charcoal-900">
                  Candidate Database Matches {matchCandidates.length > 0 && `(${matchCandidates.length} found)`}
                </h3>
                <p className="text-xs text-charcoal-500">
                  Ranked by visual similarity score with explicit matching attributes
                </p>
              </div>

              {matchCandidates.length === 0 ? (
                <div className="p-12 text-center text-xs text-charcoal-400 space-y-2 border-2 border-dashed border-warm-200 rounded-2xl">
                  <Sparkles className="w-8 h-8 mx-auto text-warm-300" />
                  <p>Click "Run AI Visual Matcher" to extract features and search the registered dog database.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matchCandidates.map((candidate, idx) => (
                    <div
                      key={candidate.dog.id}
                      className="p-5 rounded-2xl border border-warm-200 bg-warm-50/50 space-y-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={candidate.dog.photo_url}
                            alt={candidate.dog.name}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-bold text-sm text-charcoal-900">{candidate.dog.name}</p>
                            <p className="font-mono text-[10px] text-charcoal-500">
                              {candidate.dog.dog_id} • Tag: {candidate.dog.qr_tag_id}
                            </p>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full font-black text-xs ${
                              candidate.confidence > 80
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : candidate.confidence > 50
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-charcoal-100 text-charcoal-700'
                            }`}
                          >
                            {candidate.confidence}% Match
                          </span>
                        </div>
                      </div>

                      {/* Matching Features */}
                      <div className="space-y-1">
                        <span className="font-bold text-[10px] uppercase text-charcoal-400">
                          Matched Feature Attributes:
                        </span>
                        <ul className="space-y-1">
                          {candidate.matchingTraits.map((t, tIdx) => (
                            <li key={tIdx} className="flex items-start gap-1.5 text-[11px] text-emerald-900">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Differences */}
                      {candidate.differences.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-bold text-[10px] uppercase text-charcoal-400">
                            Distinguishing Differences:
                          </span>
                          <ul className="space-y-1 text-charcoal-600 text-[11px]">
                            {candidate.differences.map((d, dIdx) => (
                              <li key={dIdx} className="list-disc pl-4">
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-warm-200 flex items-center justify-between">
                        <span className="text-[10px] text-charcoal-400">
                          Verify physically using collar QR tag or microchip
                        </span>
                        <Link
                          href={`/dashboard/dogs/${candidate.dog.dog_id}`}
                          className="px-3 py-1.5 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs"
                        >
                          <span>Open Profile</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DUPLICATE DOG DETECTOR */}
        {activeTab === 'duplicates' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
            <div>
              <h3 className="font-bold text-base text-charcoal-900">Cross-Territory Duplicate Detection</h3>
              <p className="text-xs text-charcoal-500">
                Flags potential duplicate registrations across different NGOs or municipal teams to prevent double-counting
              </p>
            </div>

            <div className="space-y-4">
              {potentialDuplicates.map((dup, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-amber-300 bg-amber-50/40 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{dup.similarityIndex}% Profile Similarity Detected</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                      {dup.status}
                    </span>
                  </div>

                  <p className="text-charcoal-700 leading-relaxed">{dup.reason}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-3.5 rounded-xl border border-warm-200">
                    {dup.pair.map((d, dIdx) => (
                      <div key={dIdx} className="flex items-center gap-3">
                        <img
                          src={d?.photo_url}
                          alt={d?.name}
                          className="w-11 h-11 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-charcoal-900">{d?.name}</p>
                          <p className="font-mono text-[10px] text-charcoal-500">{d?.dog_id}</p>
                          <p className="text-[10px] text-charcoal-400">{d?.usual_area}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      onClick={() => alert('Confirmed: These are two separate dogs in adjacent territories.')}
                      className="px-3.5 py-1.5 bg-white border border-warm-300 text-charcoal-700 rounded-xl font-semibold hover:bg-warm-100"
                    >
                      Dismiss as Distinct Dogs
                    </button>
                    <button
                      onClick={() => alert('Marked for field volunteer physical collar cross-check.')}
                      className="px-3.5 py-1.5 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-2xs"
                    >
                      Schedule Field Inspection
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: RABIES RISK & HOTSPOT ZONES */}
        {activeTab === 'hotspots' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
            <div>
              <h3 className="font-bold text-base text-charcoal-900">
                Rabies Risk Hotspot & Vaccination Deficit Analysis
              </h3>
              <p className="text-xs text-charcoal-500">
                Calculated using vaccination coverage, unvaccinated dog sighting density, and reported bite incidents.
              </p>
            </div>

            <div className="space-y-4">
              {hotspotAnalysis.map((zone, idx) => (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border text-xs space-y-3 ${
                    zone.riskLevel.includes('Elevated')
                      ? 'border-rose-300 bg-rose-50/30'
                      : zone.riskLevel.includes('Moderate')
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-emerald-300 bg-emerald-50/20'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-warm-200/60 pb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-forest-800" />
                      <h4 className="font-black text-sm text-charcoal-900">{zone.zone}</h4>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold self-start sm:self-auto ${
                        zone.riskLevel.includes('Elevated')
                          ? 'bg-rose-100 text-rose-900'
                          : zone.riskLevel.includes('Moderate')
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-emerald-100 text-emerald-900'
                      }`}
                    >
                      {zone.riskLevel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-charcoal-400 block">Vaccination Coverage</span>
                      <span className="font-mono text-base font-bold text-charcoal-900">{zone.coverage}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-charcoal-400 block">Unvaccinated Density</span>
                      <span className="font-semibold text-charcoal-800">{zone.unvaccinatedDensity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-charcoal-400 block">Reported Incidents</span>
                      <span className="font-mono font-bold text-charcoal-900">{zone.biteReports}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-warm-200 space-y-1">
                    <p className="font-bold text-forest-900">Recommended Action:</p>
                    <p className="text-charcoal-700 leading-relaxed">{zone.recommendation}</p>
                    <p className="text-[10px] text-charcoal-400 pt-1 italic">
                      Explainable Rationale: {zone.rationale}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: EXPLAINABLE RULES */}
        {activeTab === 'rules' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
            <div>
              <h3 className="font-bold text-base text-charcoal-900">Explainable Decision-Support Rules</h3>
              <p className="text-xs text-charcoal-500">
                Transparent rules governing automatic alerts and immunization task generation
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                <p className="font-bold text-charcoal-900">Rule 1: Annual Rabies Booster Schedule (WHO Protocol)</p>
                <p className="text-charcoal-600 leading-relaxed">
                  Triggered when <code>current_date &gt;= (next_due_date - 30 days)</code>. Flags dog profile as <strong>Due Soon</strong> and generates field task for mobile clinic.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                <p className="font-bold text-charcoal-900">Rule 2: Duplicate Dose Prevention</p>
                <p className="text-charcoal-600 leading-relaxed">
                  Triggered when a vaccination of the same class is logged within 60 days of an existing verified dose. Does not delete data, but presents a confirmation warning to the veterinarian.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-warm-50 border border-warm-200 space-y-1">
                <p className="font-bold text-charcoal-900">Rule 3: Suspected Rabies Mandatory Isolation Protocol</p>
                <p className="text-charcoal-600 leading-relaxed">
                  Triggered when a medical exam logs <code>category == 'Suspected rabies exposure'</code> or aggression with salivation. Automatically sets dog health status to <strong>Quarantined</strong>, alerts municipal authorities, and schedules a 10-day evaluation task.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
