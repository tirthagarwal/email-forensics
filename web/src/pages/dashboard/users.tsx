import React, { useState } from 'react'
import Head from 'next/head'
import {
  Users,
  Plus,
  Search,
  Filter,
  Shield,
  UserCheck,
  Check,
  X,
  Mail,
  Phone,
  Building
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { SEED_USERS } from '../../lib/seedData'
import { UserRole } from '../../lib/types'

export default function UserManagementPage() {
  const { currentUser } = useRescueAI()

  const [users, setUsers] = useState(SEED_USERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('ngo_worker')
  const [inviteOrg, setInviteOrg] = useState('Paws & Hope Animal Welfare Trust')

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.organisation_name && u.organisation_name.toLowerCase().includes(q))
      )
    }
    return true
  })

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    const newUser = {
      id: `user-${Date.now()}`,
      email: inviteEmail.trim(),
      full_name: inviteName.trim(),
      role: inviteRole,
      organisation_name: inviteOrg.trim(),
      created_at: new Date().toISOString(),
    }
    setUsers([...users, newUser])
    setShowInviteModal(false)
    alert(`Invitation sent to ${inviteEmail}. Added to directory.`)
  }

  // Permissions Matrix
  const permissionsMatrix = [
    { module: 'Dog Registry & Registration', admin: true, ngo: true, vet: true, muni: true, public: 'Public view only' },
    { module: 'QR Collar Generation & Replacement', admin: true, ngo: true, vet: false, muni: false, public: false },
    { module: 'Vaccination History & Records', admin: true, ngo: true, vet: true, muni: 'Read-only', public: 'Public summary' },
    { module: 'Clinical Medical History & Quarantine', admin: true, ngo: 'Read-only', vet: true, muni: 'Quarantine alerts', public: false },
    { module: 'Field Activity & Vitals Logging', admin: true, ngo: true, vet: true, muni: 'Read-only', public: false },
    { module: 'Rabies Hotspot & Risk Analytics', admin: true, ngo: true, vet: true, muni: true, public: false },
    { module: 'Community Citizen Reports Review', admin: true, ngo: true, vet: false, muni: true, public: 'Submit only' },
    { module: 'Platform Security & User Admin', admin: true, ngo: false, vet: false, muni: false, public: false },
  ]

  return (
    <DashboardLayout
      title="User Management & Role Permissions"
      subtitle="Authorized personnel across animal welfare NGOs, veterinary clinics, and municipal authorities"
      actions={
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-forest-800 hover:bg-forest-900 rounded-xl shadow-soft"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Team Member</span>
        </button>
      }
    >
      <Head>
        <title>User Management — RescueAI</title>
      </Head>

      <div className="space-y-8">
        {/* USERS DIRECTORY */}
        <div className="bg-white rounded-3xl border border-warm-200 shadow-soft overflow-hidden">
          <div className="p-6 border-b border-warm-100 flex flex-col sm:flex-row gap-3 items-center justify-between text-xs">
            <h3 className="font-bold text-sm text-charcoal-900">
              Active Team Members ({filteredUsers.length})
            </h3>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search team members by name or email..."
                className="px-3.5 py-2 rounded-xl border border-warm-200 bg-warm-50 text-xs focus:outline-none"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-2 font-medium text-charcoal-700"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="ngo_worker">NGO Worker</option>
                <option value="veterinarian">Veterinarian</option>
                <option value="municipal_officer">Municipal Officer</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-100 text-charcoal-600 uppercase font-bold text-[10px] tracking-wider border-b border-warm-200">
                <tr>
                  <th className="py-3.5 px-4">Member</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Organisation</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-warm-50/70">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'}
                          alt={u.full_name}
                          className="w-9 h-9 rounded-full object-cover border border-warm-300"
                        />
                        <span className="font-bold text-charcoal-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-charcoal-600">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-warm-100 text-charcoal-800">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-charcoal-600">{u.organisation_name || 'Individual'}</td>
                    <td className="py-3.5 px-4 text-charcoal-400">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROLE PERMISSION MATRIX */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-warm-200 shadow-soft space-y-4">
          <div>
            <h3 className="font-bold text-base text-charcoal-900">Role-Based Access Control (RBAC) Matrix</h3>
            <p className="text-xs text-charcoal-500">
              Clear security boundaries governing canine records, medical notes, and public scan views
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-warm-100 text-charcoal-600 uppercase font-bold text-[10px] tracking-wider border-b border-warm-200">
                <tr>
                  <th className="py-3.5 px-4">Platform Module</th>
                  <th className="py-3.5 px-3 text-center">Admin</th>
                  <th className="py-3.5 px-3 text-center">NGO Worker</th>
                  <th className="py-3.5 px-3 text-center">Veterinarian</th>
                  <th className="py-3.5 px-3 text-center">Municipal Cell</th>
                  <th className="py-3.5 px-3 text-center">Citizen Public</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-warm-100">
                {permissionsMatrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-warm-50/70">
                    <td className="py-3 px-4 font-semibold text-charcoal-800">{row.module}</td>
                    <td className="py-3 px-3 text-center">
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.ngo === true ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : row.ngo === 'Read-only' ? (
                        <span className="text-[10px] text-teal-800 font-bold">Read-only</span>
                      ) : (
                        <X className="w-4 h-4 text-charcoal-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.vet === true ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-charcoal-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {row.muni === true ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : typeof row.muni === 'string' ? (
                        <span className="text-[10px] text-amber-800 font-bold">{row.muni}</span>
                      ) : (
                        <X className="w-4 h-4 text-charcoal-300 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {typeof row.public === 'string' ? (
                        <span className="text-[10px] text-teal-800 font-bold">{row.public}</span>
                      ) : (
                        <X className="w-4 h-4 text-charcoal-300 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL: Invite Member */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-warm-200 shadow-soft-lg space-y-4">
              <h3 className="font-bold text-lg text-charcoal-900">Invite Team Member</h3>

              <form onSubmit={handleInvite} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-charcoal-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="rajesh@vetcare.org"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Designated Role *</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm bg-white font-medium"
                    >
                      <option value="ngo_worker">NGO Field Officer</option>
                      <option value="veterinarian">Veterinarian (DVM)</option>
                      <option value="municipal_officer">Municipal Officer</option>
                      <option value="admin">Platform Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-charcoal-700">Organisation</label>
                    <input
                      type="text"
                      value={inviteOrg}
                      onChange={(e) => setInviteOrg(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-300 text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl text-charcoal-600 hover:bg-warm-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-forest-800 hover:bg-forest-900 text-white font-bold rounded-xl shadow-soft"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
