// Central type definitions matching the forensic_report.json schema

export interface ReportMetadata {
  framework_name: string
  version: string
  generated_at: string
  tls_keylog_supplied: boolean
  tls_keylog_decryption_status: string
}

export interface PcapInfo {
  total_pcaps: number
  files_analyzed: string[]
  analyzed_at: string
  total_connections: number
}

export interface Summary {
  total_pcaps: number
  total_sessions: number
  total_findings: number
  baseline_score: number
  cryptographic_score: number
  overall_risk_score: number
  score_delta: number
  risk_level: string
  total_ml_anomalies: number
}

export interface SecurityControl {
  control_id: string
  category: string
  name: string
  observed: string
  expected: string
  status: string
  status_symbol: string
  severity: string
  why: string
  evidence: string
  recommendation: string
  score_contribution: number
}

export interface RiskContributor {
  rule_id: string
  title: string
  points_added: number
  occurrences: number
}

export interface SecurityAssessment {
  baseline_score: number
  cryptographic_score: number
  final_score: number
  score_delta: number
  controls: SecurityControl[]
  violations: SecurityControl[]
  risk_contributors: RiskContributor[]
}

export interface Connection {
  uid: string
  pcap_source: string
  source: string
  destination: string
  protocol: string
  service: string
  duration_seconds: number
  client_bytes: number
  server_bytes: number
  conn_state: string
}

export interface EmailSession {
  uid: string
  protocol: string
  encryption_mode: string
  starttls_attempted: boolean
  starttls_accepted: boolean
  implicit_tls: boolean
  tls_established: boolean
  authentication_observed: boolean
  plaintext_auth_risk: boolean
  extracted_commands: string[]
  tls_version?: string
  cipher_suite?: string
  ml_anomaly_score?: number
}

export interface TlsSession {
  uid: string
  version: string
  cipher: string
  curve: string
  server_name: string
  established: boolean
  validation_status: string
  sni_matches_cert: boolean
}

export interface Certificate {
  fingerprint_sha256: string
  subject: string
  issuer: string
  serial: string
  key_length: number
  key_algorithm: string
  signature_algorithm: string
}

export interface CryptoFeature {
  uid: string
  protocol: string
  starttls_detected: boolean
  starttls_accepted: boolean
  implicit_tls: boolean
  tls_established: boolean
  authentication_observed: boolean
  plaintext_auth_risk: boolean
  server_name?: string
  tls_version?: string
  cipher_suite?: string
  elliptic_curve?: string
  key_exchange?: string
  forward_secrecy_indicator: boolean
  weak_tls_version: boolean
  weak_cipher: boolean
  weak_key_exchange: boolean
  weak_curve: boolean
  certificate_visibility_status: string
  certificate_visibility_reason: string
  certificate_public_key_algorithm?: string
  certificate_signature_algorithm?: string
  certificate_key_size?: number
  weak_key_size: boolean
  weak_signature_algorithm: boolean
  certificate_self_signed: boolean
  certificate_expired: boolean
  certificate_not_yet_valid: boolean
  certificate_days_remaining?: number
  certificate_hostname_match: boolean
  certificate_problem: boolean
  missing_starttls: boolean
  failed_starttls: boolean
  deprecated_crypto: boolean
  ja3?: string | null
  ja3s?: string | null
  ja4?: string | null
  ja4s?: string | null
  _client_bytes?: number
  _server_bytes?: number
  _client_packets?: number
  _server_packets?: number
  _duration?: number
}

export interface Finding {
  rule_id: string
  severity: string
  title: string
  description: string
  evidence: string
  affected_connection: string
  affected_protocol: string
  confidence: string
  security_impact: string
  references: string[]
  recommendation: string
  technical_remediation: string
}

export interface MlResult {
  model_name: string
  model_version: string
  feature_schema_version: string
  raw_score: number
  anomaly_score: number
  ml_anomaly_score: number
  threshold: number
  is_anomaly: boolean
  feature_values_used: Record<string, number>
  training_source: string
  integrity_status: string
  evaluation_status: string
  explanation: string
  anomalous_features: string[]
}

export interface MlAnalysis {
  model_name: string
  model_version: string
  feature_schema_version: string
  total_anomalies_detected: number
  results: MlResult[]
}

export interface SessionExplanation {
  session_uid: string
  session_summary: string
  risk_score: number
  risk_level: string
  ml_anomaly: boolean
  ml_anomaly_score: number
  why_suspicious: string[]
  evidence_breakdown: string[]
  security_impact: string
  recommended_action_plan: string[]
}

export interface EnterprisePosture {
  enterprise_risk_score: number
  enterprise_risk_level: string
  total_email_sessions: number
  protocol_breakdown: Record<string, number>
  tls_version_distribution: Record<string, number>
  cipher_suite_distribution: Record<string, number>
  server_distribution: Record<string, number>
  certificate_distribution: Record<string, number>
  top_affected_systems: Array<{ server: string; finding_count: number }>
  recurring_weaknesses: string[]
}

export interface ForensicReport {
  report_metadata: ReportMetadata
  pcap: PcapInfo
  summary: Summary
  security_assessment: SecurityAssessment
  connections: Connection[]
  email_sessions: EmailSession[]
  tls_sessions: TlsSession[]
  certificates: Certificate[]
  cryptographic_features: CryptoFeature[]
  findings: Finding[]
  finding_groups: Record<string, Finding[]>
  risk_assessment: {
    overall_risk_score: number
    risk_level: string
    max_session_score: number
    average_session_score: number
    contributors: RiskContributor[]
  }
  ml_analysis: MlAnalysis
  session_explanations: SessionExplanation[]
  recommendations: Array<{
    priority_step: number
    rule_id: string
    severity: string
    action_summary: string
    recommendation: string
  }>
  enterprise_posture: EnterprisePosture
}
