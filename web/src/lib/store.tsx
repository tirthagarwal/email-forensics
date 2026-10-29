import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  Dog,
  QRDevice,
  VaccinationRecord,
  MedicalRecord,
  HealthObservation,
  DogSighting,
  CommunityReport,
  Notification,
  Task,
  UserProfile,
  UserRole,
  AuditLog
} from './types'
import {
  SEED_DOGS,
  SEED_DEVICES,
  SEED_VACCINATIONS,
  SEED_MEDICAL_RECORDS,
  SEED_OBSERVATIONS,
  SEED_SIGHTINGS,
  SEED_COMMUNITY_REPORTS,
  SEED_NOTIFICATIONS,
  SEED_TASKS,
  SEED_USERS,
  SEED_AUDIT_LOGS
} from './seedData'
import { isSupabaseConfigured, supabase } from './supabaseClient'

interface RescueAIContextType {
  currentUser: UserProfile | null
  setCurrentUser: (user: UserProfile | null) => void
  dogs: Dog[]
  devices: QRDevice[]
  vaccinations: VaccinationRecord[]
  medicalRecords: MedicalRecord[]
  observations: HealthObservation[]
  sightings: DogSighting[]
  communityReports: CommunityReport[]
  notifications: Notification[]
  tasks: Task[]
  auditLogs: AuditLog[]
  isDemoMode: boolean
  isSupabaseActive: boolean
  loginAsRole: (role: UserRole) => void
  logout: () => void
  registerDog: (dogData: Partial<Dog>) => { success: boolean; dog: Dog }
  updateDog: (id: string, updates: Partial<Dog>) => void
  archiveDog: (id: string) => void
  addVaccinationRecord: (record: Omit<VaccinationRecord, 'id' | 'created_at'>) => {
    success: boolean
    isDuplicateWarning?: boolean
    record: VaccinationRecord
  }
  checkDuplicateVaccination: (dogId: string, vaccineName: string, date: string) => boolean
  addMedicalRecord: (record: Omit<MedicalRecord, 'id' | 'created_at'>) => MedicalRecord
  addObservation: (obs: Omit<HealthObservation, 'id' | 'recorded_at'>) => HealthObservation
  submitCommunityReport: (report: Omit<CommunityReport, 'id' | 'reference_number' | 'reported_at' | 'created_at' | 'status'>) => string
  updateReportStatus: (id: string, status: CommunityReport['status'], assignedWorker?: string, internalNotes?: string) => void
  submitSighting: (sighting: Omit<DogSighting, 'id' | 'reported_at'>) => void
  replaceQRTag: (dogId: string, newTagId: string, reason: string) => void
  updateTaskStatus: (taskId: string, status: Task['status'], completionNotes?: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  resetToDemoData: () => void
  getDogByDogId: (dogId: string) => Dog | undefined
}

const RescueAIContext = createContext<RescueAIContextType | undefined>(undefined)

const STORAGE_KEYS = {
  USER: 'rescueai_user',
  DOGS: 'rescueai_dogs',
  DEVICES: 'rescueai_devices',
  VACCINATIONS: 'rescueai_vaccinations',
  MEDICAL: 'rescueai_medical',
  OBSERVATIONS: 'rescueai_observations',
  SIGHTINGS: 'rescueai_sightings',
  REPORTS: 'rescueai_reports',
  NOTIFICATIONS: 'rescueai_notifications',
  TASKS: 'rescueai_tasks',
  AUDIT_LOGS: 'rescueai_audit_logs',
}

export const RescueAIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(SEED_USERS[0]) // Default Dr. Sarah Jenkins (Admin)
  const [dogs, setDogs] = useState<Dog[]>(SEED_DOGS)
  const [devices, setDevices] = useState<QRDevice[]>(SEED_DEVICES)
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>(SEED_VACCINATIONS)
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(SEED_MEDICAL_RECORDS)
  const [observations, setObservations] = useState<HealthObservation[]>(SEED_OBSERVATIONS)
  const [sightings, setSightings] = useState<DogSighting[]>(SEED_SIGHTINGS)
  const [communityReports, setCommunityReports] = useState<CommunityReport[]>(SEED_COMMUNITY_REPORTS)
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS)
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(SEED_AUDIT_LOGS)
  const [isDemoMode] = useState<boolean>(!isSupabaseConfigured)

  // Initialize from LocalStorage in client browser
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const savedUser = localStorage.getItem(STORAGE_KEYS.USER)
      if (savedUser) setCurrentUser(JSON.parse(savedUser))

      const savedDogs = localStorage.getItem(STORAGE_KEYS.DOGS)
      if (savedDogs) setDogs(JSON.parse(savedDogs))

      const savedDevices = localStorage.getItem(STORAGE_KEYS.DEVICES)
      if (savedDevices) setDevices(JSON.parse(savedDevices))

      const savedVaccinations = localStorage.getItem(STORAGE_KEYS.VACCINATIONS)
      if (savedVaccinations) setVaccinations(JSON.parse(savedVaccinations))

      const savedMedical = localStorage.getItem(STORAGE_KEYS.MEDICAL)
      if (savedMedical) setMedicalRecords(JSON.parse(savedMedical))

      const savedObs = localStorage.getItem(STORAGE_KEYS.OBSERVATIONS)
      if (savedObs) setObservations(JSON.parse(savedObs))

      const savedSightings = localStorage.getItem(STORAGE_KEYS.SIGHTINGS)
      if (savedSightings) setSightings(JSON.parse(savedSightings))

      const savedReports = localStorage.getItem(STORAGE_KEYS.REPORTS)
      if (savedReports) setCommunityReports(JSON.parse(savedReports))

      const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)
      if (savedNotifs) setNotifications(JSON.parse(savedNotifs))

      const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS)
      if (savedTasks) setTasks(JSON.parse(savedTasks))

      const savedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)
      if (savedLogs) setAuditLogs(JSON.parse(savedLogs))
    } catch (e) {
      console.warn('Could not read from localStorage, using in-memory seed data', e)
    }
  }, [])

  // Sync helpers
  const saveDogs = (newDogs: Dog[]) => {
    setDogs(newDogs)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.DOGS, JSON.stringify(newDogs))
  }

  const saveDevices = (newDevs: QRDevice[]) => {
    setDevices(newDevs)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(newDevs))
  }

  const saveVaccinations = (newVacs: VaccinationRecord[]) => {
    setVaccinations(newVacs)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.VACCINATIONS, JSON.stringify(newVacs))
  }

  const saveMedical = (newMed: MedicalRecord[]) => {
    setMedicalRecords(newMed)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.MEDICAL, JSON.stringify(newMed))
  }

  const saveObservations = (newObs: HealthObservation[]) => {
    setObservations(newObs)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.OBSERVATIONS, JSON.stringify(newObs))
  }

  const saveSightings = (newSights: DogSighting[]) => {
    setSightings(newSights)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.SIGHTINGS, JSON.stringify(newSights))
  }

  const saveReports = (newReps: CommunityReport[]) => {
    setCommunityReports(newReps)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(newReps))
  }

  const saveNotifications = (newNotifs: Notification[]) => {
    setNotifications(newNotifs)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(newNotifs))
  }

  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newTasks))
  }

  const saveAuditLogs = (newLogs: AuditLog[]) => {
    setAuditLogs(newLogs)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(newLogs))
  }

  const logAudit = (action: string, entity_type: string, entity_id: string, details: string) => {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_id: currentUser?.id || 'anonymous',
      user_name: currentUser?.full_name || 'System / Anonymous',
      action,
      entity_type,
      entity_id,
      details,
    }
    saveAuditLogs([newLog, ...auditLogs])
  }

  // Quick switch role
  const loginAsRole = (role: UserRole) => {
    const target = SEED_USERS.find(u => u.role === role) || SEED_USERS[0]
    setCurrentUser(target)
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(target))
    logAudit('USER_LOGIN', 'user', target.id, `User switched session to role: ${role}`)
  }

  const logout = () => {
    setCurrentUser(null)
    if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEYS.USER)
  }

  const getDogByDogId = (dogId: string) => {
    return dogs.find(d => d.dog_id.toLowerCase() === dogId.toLowerCase() || d.id === dogId)
  }

  // Register a new dog
  const registerDog = (dogData: Partial<Dog>) => {
    // Generate sequential unique dog_id
    const count = dogs.length + 1
    const pad = String(count).padStart(4, '0')
    const dog_id = dogData.dog_id || `RAI-DOG-${pad}`
    const tag_id = dogData.qr_tag_id || `TAG-RAI-${pad}`
    const newId = `dog-${Date.now()}`

    const newDog: Dog = {
      id: newId,
      dog_id,
      name: dogData.name || 'Unknown Stray Dog',
      photo_url: dogData.photo_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
      breed: dogData.breed || 'Indie / Street Mix',
      estimated_age: dogData.estimated_age || 'Unknown age',
      sex: dogData.sex || 'Unknown',
      color_markings: dogData.color_markings || 'Street dog coat',
      sterilization_status: dogData.sterilization_status || 'Unknown',
      health_status: dogData.health_status || 'Healthy',
      vaccination_status: dogData.vaccination_status || 'Unvaccinated',
      date_registered: dogData.date_registered || new Date().toISOString().split('T')[0],
      usual_area: dogData.usual_area || 'Central District',
      last_sighting_location: dogData.last_sighting_location || {
        lat: 28.5355,
        lng: 77.3910,
        address: dogData.usual_area || 'Central District',
        timestamp: new Date().toISOString(),
      },
      assigned_ngo_id: currentUser?.organisation_id || 'org-1',
      assigned_ngo_name: currentUser?.organisation_name || 'Paws & Hope Animal Welfare Trust',
      microchip_id: dogData.microchip_id || undefined,
      qr_tag_id: tag_id,
      status: 'active',
      notes: dogData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Create corresponding QR Device
    const newDevice: QRDevice = {
      id: `dev-${Date.now()}`,
      tag_id,
      dog_id: newDog.dog_id,
      dog_name: newDog.name,
      qr_status: 'Active',
      issue_date: newDog.date_registered,
      scan_count: 0,
      device_condition: 'Good',
      assigned_organisation: newDog.assigned_ngo_name || 'Paws & Hope Animal Welfare Trust',
      notes: `Initial QR collar tag issued upon dog registration.`,
    }

    const updatedDogs = [newDog, ...dogs]
    const updatedDevs = [newDevice, ...devices]
    saveDogs(updatedDogs)
    saveDevices(updatedDevs)

    // Audit log
    logAudit('REGISTER_DOG', 'dog', newDog.dog_id, `Registered ${newDog.name} (${newDog.dog_id}) with tag ${tag_id}`)

    // Create Notification if health status requires attention
    if (newDog.health_status === 'Critical' || newDog.health_status === 'Quarantined') {
      const newNotif: Notification = {
        id: `notif-${Date.now()}`,
        title: `Urgent Dog Registered: ${newDog.name}`,
        message: `${newDog.dog_id} registered with health status: ${newDog.health_status}.`,
        type: 'urgent_health',
        severity: 'critical',
        dog_id: newDog.dog_id,
        is_read: false,
        created_at: new Date().toISOString(),
      }
      saveNotifications([newNotif, ...notifications])
    }

    return { success: true, dog: newDog }
  }

  // Update dog
  const updateDog = (id: string, updates: Partial<Dog>) => {
    const updated = dogs.map(d => (d.id === id || d.dog_id === id ? { ...d, ...updates, updated_at: new Date().toISOString() } : d))
    saveDogs(updated)
    logAudit('UPDATE_DOG', 'dog', id, `Updated profile details for dog: ${id}`)
  }

  // Archive dog with deactivation of QR collar
  const archiveDog = (id: string) => {
    const target = dogs.find(d => d.id === id || d.dog_id === id)
    if (!target) return
    const updated = dogs.map(d => (d.id === target.id ? { ...d, status: 'archived' as const } : d))
    saveDogs(updated)

    // Deactivate tag
    const updatedDevs = devices.map(dev => (dev.dog_id === target.dog_id ? { ...dev, qr_status: 'Deactivated' as const } : dev))
    saveDevices(updatedDevs)

    logAudit('ARCHIVE_DOG', 'dog', target.dog_id, `Archived profile and deactivated QR tag ${target.qr_tag_id}`)
  }

  // Duplicate vaccination prevention check
  const checkDuplicateVaccination = (dogId: string, vaccineName: string, date: string) => {
    const targetDate = new Date(date).getTime()
    return vaccinations.some(v => {
      if (v.dog_id !== dogId) return false
      const vDate = new Date(v.date_administered).getTime()
      const diffDays = Math.abs((targetDate - vDate) / (1000 * 60 * 60 * 24))
      // Same vaccine within 60 days is flagged as potential duplicate
      return (
        diffDays < 60 &&
        (v.vaccine_name.toLowerCase().includes(vaccineName.toLowerCase()) ||
          vaccineName.toLowerCase().includes(v.vaccine_name.toLowerCase()))
      )
    })
  }

  // Add vaccination record
  const addVaccinationRecord = (record: Omit<VaccinationRecord, 'id' | 'created_at'>) => {
    const isDup = checkDuplicateVaccination(record.dog_id, record.vaccine_name, record.date_administered)

    const newRecord: VaccinationRecord = {
      ...record,
      id: `vac-${Date.now()}`,
      status: isDup ? 'Duplicate_Flagged' : 'Valid',
      created_at: new Date().toISOString(),
    }

    const updated = [newRecord, ...vaccinations]
    saveVaccinations(updated)

    // Automatically recalculate dog's vaccination_status
    const dogVacs = updated.filter(v => v.dog_id === record.dog_id)
    const hasRabies = dogVacs.some(v => v.disease_targeted.toLowerCase().includes('rabies') || v.vaccine_name.toLowerCase().includes('rabies'))
    const now = new Date()

    let newStatus: Dog['vaccination_status'] = 'Vaccinated'
    const dueDates = dogVacs.map(v => (v.next_due_date ? new Date(v.next_due_date) : null)).filter(Boolean) as Date[]

    if (dueDates.some(d => d.getTime() < now.getTime())) {
      newStatus = 'Overdue'
    } else if (dueDates.some(d => (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 30)) {
      newStatus = 'Due Soon'
    } else if (!hasRabies) {
      newStatus = 'Unvaccinated'
    }

    updateDog(record.dog_id, { vaccination_status: newStatus })

    logAudit('ADD_VACCINATION', 'vaccination_record', newRecord.id, `Recorded ${record.vaccine_name} for ${record.dog_id}`)

    return { success: true, isDuplicateWarning: isDup, record: newRecord }
  }

  // Add medical record
  const addMedicalRecord = (record: Omit<MedicalRecord, 'id' | 'created_at'>) => {
    const newRecord: MedicalRecord = {
      ...record,
      id: `med-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    const updated = [newRecord, ...medicalRecords]
    saveMedical(updated)

    // If suspected rabies or urgent escalation, update dog health_status and send alert
    if (record.category === 'Suspected rabies exposure' || record.urgent_escalation) {
      updateDog(record.dog_id, { health_status: 'Quarantined' })

      const newNotif: Notification = {
        id: `notif-${Date.now()}`,
        title: `CRITICAL RABIES ESCALATION: ${record.dog_id}`,
        message: `Dog ${record.dog_id} placed under quarantine protocol for suspected rabies exposure.`,
        type: 'urgent_health',
        severity: 'critical',
        dog_id: record.dog_id,
        is_read: false,
        created_at: new Date().toISOString(),
      }
      saveNotifications([newNotif, ...notifications])
    } else if (record.recovery_status === 'Ongoing Treatment' || record.recovery_status === 'Critical') {
      updateDog(record.dog_id, { health_status: 'Needs Treatment' })
    }

    logAudit('ADD_MEDICAL_RECORD', 'medical_record', newRecord.id, `Logged medical exam for dog ${record.dog_id}: ${record.category}`)
    return newRecord
  }

  // Add Health Observation
  const addObservation = (obs: Omit<HealthObservation, 'id' | 'recorded_at'>) => {
    const newObs: HealthObservation = {
      ...obs,
      id: `obs-${Date.now()}`,
      recorded_at: new Date().toISOString(),
    }
    saveObservations([newObs, ...observations])
    logAudit('ADD_OBSERVATION', 'health_observation', newObs.id, `Recorded observation for ${obs.dog_id} by ${obs.observer_name}`)
    return newObs
  }

  // Submit Community Report
  const submitCommunityReport = (report: Omit<CommunityReport, 'id' | 'reference_number' | 'reported_at' | 'created_at' | 'status'>) => {
    const randomRef = `REP-2026-${Math.floor(1000 + Math.random() * 9000)}`
    const newReport: CommunityReport = {
      ...report,
      id: `rep-${Date.now()}`,
      reference_number: randomRef,
      status: 'New',
      reported_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }
    const updated = [newReport, ...communityReports]
    saveReports(updated)

    // Notify field staff
    const newNotif: Notification = {
      id: `notif-${Date.now()}`,
      title: `New Community Report: ${report.report_type}`,
      message: `Reference ${randomRef}: ${report.description.slice(0, 80)}...`,
      type: 'community_report',
      severity: report.report_type === 'Suspected Rabies Concern' ? 'critical' : 'info',
      report_id: newReport.id,
      is_read: false,
      created_at: new Date().toISOString(),
    }
    saveNotifications([newNotif, ...notifications])

    logAudit('SUBMIT_REPORT', 'community_report', randomRef, `Citizen report submitted: ${report.report_type} at ${report.location.address}`)
    return randomRef
  }

  const updateReportStatus = (id: string, status: CommunityReport['status'], assignedWorker?: string, internalNotes?: string) => {
    const updated = communityReports.map(r => {
      if (r.id === id || r.reference_number === id) {
        return {
          ...r,
          status,
          assigned_worker: assignedWorker !== undefined ? assignedWorker : r.assigned_worker,
          internal_notes: internalNotes !== undefined ? internalNotes : r.internal_notes,
        }
      }
      return r
    })
    saveReports(updated)
    logAudit('UPDATE_REPORT_STATUS', 'community_report', id, `Status updated to ${status}`)
  }

  // Submit Dog Sighting
  const submitSighting = (sighting: Omit<DogSighting, 'id' | 'reported_at'>) => {
    const newSighting: DogSighting = {
      ...sighting,
      id: `sight-${Date.now()}`,
      reported_at: new Date().toISOString(),
    }
    saveSightings([newSighting, ...sightings])

    // Update dog's last known location if dog_id matches
    if (sighting.dog_id) {
      updateDog(sighting.dog_id, {
        last_sighting_location: {
          ...sighting.location,
          timestamp: new Date().toISOString(),
        },
      })
    }
    logAudit('SUBMIT_SIGHTING', 'dog_sighting', newSighting.id, `Sighting logged for ${sighting.dog_id || 'unknown dog'} at ${sighting.location.address}`)
  }

  // Replace QR Tag
  const replaceQRTag = (dogId: string, newTagId: string, reason: string) => {
    const dog = dogs.find(d => d.dog_id === dogId)
    if (!dog) return

    // Deactivate old device
    const updatedDevs = devices.map(dev => {
      if (dev.dog_id === dogId && dev.qr_status === 'Active') {
        return {
          ...dev,
          qr_status: 'Replaced' as const,
          device_condition: 'Damaged' as const,
          notes: `Replaced by ${newTagId}. Reason: ${reason}`,
        }
      }
      return dev
    })

    // Add new active device
    const newDev: QRDevice = {
      id: `dev-${Date.now()}`,
      tag_id: newTagId,
      dog_id: dog.dog_id,
      dog_name: dog.name,
      qr_status: 'Active',
      issue_date: new Date().toISOString().split('T')[0],
      scan_count: 0,
      device_condition: 'Good',
      assigned_organisation: dog.assigned_ngo_name || 'Paws & Hope Animal Welfare Trust',
      notes: `Replacement tag. Reason: ${reason}`,
    }

    saveDevices([newDev, ...updatedDevs])
    updateDog(dog.id, { qr_tag_id: newTagId })
    logAudit('REPLACE_QR_TAG', 'qr_device', newTagId, `Replaced QR collar tag for dog ${dogId} with new tag ${newTagId}`)
  }

  // Tasks
  const updateTaskStatus = (taskId: string, status: Task['status'], completionNotes?: string) => {
    const updated = tasks.map(t => (t.id === taskId ? { ...t, status, completion_notes: completionNotes || t.completion_notes } : t))
    saveTasks(updated)
    logAudit('UPDATE_TASK', 'task', taskId, `Task status changed to ${status}`)
  }

  // Notifications
  const markNotificationRead = (id: string) => {
    const updated = notifications.map(n => (n.id === id ? { ...n, is_read: true } : n))
    saveNotifications(updated)
  }

  const markAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, is_read: true }))
    saveNotifications(updated)
  }

  // Reset to initial Seed Data
  const resetToDemoData = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.USER)
      localStorage.removeItem(STORAGE_KEYS.DOGS)
      localStorage.removeItem(STORAGE_KEYS.DEVICES)
      localStorage.removeItem(STORAGE_KEYS.VACCINATIONS)
      localStorage.removeItem(STORAGE_KEYS.MEDICAL)
      localStorage.removeItem(STORAGE_KEYS.OBSERVATIONS)
      localStorage.removeItem(STORAGE_KEYS.SIGHTINGS)
      localStorage.removeItem(STORAGE_KEYS.REPORTS)
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS)
      localStorage.removeItem(STORAGE_KEYS.TASKS)
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS)
    }
    setCurrentUser(SEED_USERS[0])
    setDogs(SEED_DOGS)
    setDevices(SEED_DEVICES)
    setVaccinations(SEED_VACCINATIONS)
    setMedicalRecords(SEED_MEDICAL_RECORDS)
    setObservations(SEED_OBSERVATIONS)
    setSightings(SEED_SIGHTINGS)
    setCommunityReports(SEED_COMMUNITY_REPORTS)
    setNotifications(SEED_NOTIFICATIONS)
    setTasks(SEED_TASKS)
    setAuditLogs(SEED_AUDIT_LOGS)
  }

  return (
    <RescueAIContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        dogs,
        devices,
        vaccinations,
        medicalRecords,
        observations,
        sightings,
        communityReports,
        notifications,
        tasks,
        auditLogs,
        isDemoMode,
        isSupabaseActive: isSupabaseConfigured,
        loginAsRole,
        logout,
        registerDog,
        updateDog,
        archiveDog,
        addVaccinationRecord,
        checkDuplicateVaccination,
        addMedicalRecord,
        addObservation,
        submitCommunityReport,
        updateReportStatus,
        submitSighting,
        replaceQRTag,
        updateTaskStatus,
        markNotificationRead,
        markAllNotificationsRead,
        resetToDemoData,
        getDogByDogId,
      }}
    >
      {children}
    </RescueAIContext.Provider>
  )
}

export const useRescueAI = () => {
  const context = useContext(RescueAIContext)
  if (!context) {
    throw new Error('useRescueAI must be used within a RescueAIProvider')
  }
  return context
}
