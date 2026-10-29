export type UserRole = 'admin' | 'ngo_worker' | 'veterinarian' | 'municipal_officer' | 'citizen'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: UserRole
  organisation_id?: string
  organisation_name?: string
  phone?: string
  avatar_url?: string
  created_at: string
}

export interface Organisation {
  id: string
  name: string
  type: 'ngo' | 'veterinary_clinic' | 'municipality' | 'shelter'
  contact_email: string
  contact_phone: string
  address: string
  city: string
  verification_status: 'Verified' | 'Pending'
}

export type HealthStatus = 'Healthy' | 'Needs Treatment' | 'Critical' | 'Under Observation' | 'Quarantined'
export type VaccinationStatus = 'Vaccinated' | 'Due Soon' | 'Overdue' | 'Unvaccinated' | 'Unknown' | 'Verification Required'
export type SterilizationStatus = 'Sterilized' | 'Intact' | 'Unknown'
export type Sex = 'Male' | 'Female' | 'Unknown'

export interface GeoLocation {
  lat: number
  lng: number
  address: string
  timestamp?: string
}

export interface Dog {
  id: string
  dog_id: string // e.g. RAI-DOG-0001
  name: string
  photo_url: string
  breed: string
  estimated_age: string
  sex: Sex
  color_markings: string
  sterilization_status: SterilizationStatus
  health_status: HealthStatus
  vaccination_status: VaccinationStatus
  date_registered: string
  usual_area: string
  last_sighting_location: GeoLocation
  assigned_ngo_id?: string
  assigned_ngo_name?: string
  microchip_id?: string
  qr_tag_id: string
  status: 'active' | 'archived' | 'deactivated'
  notes?: string
  created_at: string
  updated_at: string
}

export type QRDeviceStatus = 'Active' | 'Damaged' | 'Lost' | 'Replaced' | 'Deactivated'

export interface QRDevice {
  id: string
  tag_id: string // e.g. TAG-RAI-0001
  dog_id: string
  dog_name: string
  qr_status: QRDeviceStatus
  issue_date: string
  last_scanned_at?: string
  scan_count: number
  device_condition: 'Good' | 'Worn' | 'Damaged' | 'Missing'
  assigned_organisation: string
  notes?: string
}

export interface VaccinationRecord {
  id: string
  dog_id: string
  vaccine_name: string
  disease_targeted: string
  date_administered: string
  next_due_date?: string
  dose_info: string
  veterinarian_name: string
  veterinary_org: string
  batch_number?: string
  notes?: string
  document_url?: string
  status: 'Valid' | 'Overdue' | 'Duplicate_Flagged' | 'Verified'
  created_at: string
}

export type MedicalCategory =
  | 'Injury'
  | 'Infection'
  | 'Skin condition'
  | 'Digestive problem'
  | 'Respiratory symptoms'
  | 'Suspected rabies exposure'
  | 'Routine examination'
  | 'Other'

export type RecoveryStatus = 'Full Recovery' | 'Improving' | 'Ongoing Treatment' | 'Critical' | 'Guarded'

export interface MedicalRecord {
  id: string
  dog_id: string
  examination_date: string
  category: MedicalCategory
  symptoms: string[]
  observed_injuries?: string
  suspected_condition: string
  confirmed_diagnosis?: string
  treatment_provided: string
  medication_details?: string
  veterinarian_name: string
  treating_org: string
  follow_up_date?: string
  recovery_status: RecoveryStatus
  attachments?: string[]
  notes?: string
  urgent_escalation?: boolean
  created_at: string
}

export interface HealthObservation {
  id: string
  dog_id: string
  recorded_at: string
  activity_behavior: 'Normal & Energetic' | 'Lethargic' | 'Aggressive' | 'Shy / Hiding' | 'Restless'
  appetite: 'Normal' | 'Reduced' | 'Refusing Food' | 'Increased'
  mobility: 'Normal' | 'Limping' | 'Reluctant to move' | 'Non-ambulatory'
  visible_injuries?: string
  general_condition: 'Good' | 'Fair' | 'Poor' | 'Critical'
  body_temperature_c?: number
  heart_rate_bpm?: number
  respiratory_rate?: number
  weight_kg?: number
  observer_name: string
  observer_role: string
  notes?: string
  triage_level: 'Normal' | 'Needs Attention' | 'Urgent'
}

export interface DogSighting {
  id: string
  dog_id?: string
  dog_name?: string
  reported_at: string
  location: GeoLocation
  photo_url?: string
  health_observation?: string
  reporter_type: 'Citizen' | 'Field Worker' | 'Municipal Staff' | 'Vet'
  reporter_name?: string
  reporter_contact?: string
  verified: boolean
}

export type ReportType =
  | 'Injured Dog'
  | 'Sick Dog'
  | 'Suspected Rabies Concern'
  | 'Dog Sighting'
  | 'Damaged / Missing Collar'

export type ReportStatus = 'New' | 'Under Review' | 'Assigned' | 'In Progress' | 'Resolved' | 'Rejected'

export interface CommunityReport {
  id: string
  reference_number: string
  report_type: ReportType
  description: string
  location: {
    lat?: number
    lng?: number
    address: string
  }
  reported_at: string
  photo_url?: string
  dog_id?: string
  reporter_name?: string
  reporter_phone?: string
  reporter_email?: string
  status: ReportStatus
  assigned_worker?: string
  internal_notes?: string
  resolution_notes?: string
  created_at: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type:
    | 'vaccination_due'
    | 'vaccination_overdue'
    | 'medical_followup'
    | 'community_report'
    | 'urgent_health'
    | 'duplicate_warning'
    | 'device_issue'
  severity: 'info' | 'warning' | 'critical'
  dog_id?: string
  report_id?: string
  is_read: boolean
  created_at: string
}

export interface Task {
  id: string
  title: string
  related_dog_id?: string
  related_dog_name?: string
  related_report_id?: string
  assigned_worker: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  due_date: string
  status: 'Pending' | 'In Progress' | 'Completed'
  notes?: string
  completion_notes?: string
  created_at: string
}

export interface AuditLog {
  id: string
  timestamp: string
  user_id: string
  user_name: string
  action: string
  entity_type: string
  entity_id: string
  details: string
}
