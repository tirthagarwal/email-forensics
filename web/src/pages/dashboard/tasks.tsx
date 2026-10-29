import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  User,
  Calendar,
  ExternalLink,
  ChevronRight
} from 'lucide-react'
import { DashboardLayout } from '../../components/DashboardLayout'
import { useRescueAI } from '../../lib/store'
import { Task } from '../../lib/types'

export default function TasksPage() {
  const { tasks, updateTaskStatus, currentUser, dogs } = useRescueAI()

  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
    return true
  })

  const handleToggleStatus = (task: Task) => {
    const nextStatus =
      task.status === 'Pending'
        ? 'In Progress'
        : task.status === 'In Progress'
        ? 'Completed'
        : 'Pending'

    updateTaskStatus(task.id, nextStatus)
  }

  return (
    <DashboardLayout
      title="Field Tasks & Operational Dispatch"
      subtitle="Vaccination visits, bandage inspections, quarantine evaluations, and collar replacements"
    >
      <Head>
        <title>Tasks & Field Work — RescueAI</title>
      </Head>

      <div className="space-y-6">
        {/* STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Total Assigned Tasks</span>
            <p className="text-2xl font-black text-charcoal-900 font-mono mt-1">{tasks.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Pending Actions</span>
            <p className="text-2xl font-black text-amber-800 font-mono mt-1">
              {tasks.filter((t) => t.status === 'Pending').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">In Field Progress</span>
            <p className="text-2xl font-black text-teal-800 font-mono mt-1">
              {tasks.filter((t) => t.status === 'In Progress').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-warm-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">Completed Tasks</span>
            <p className="text-2xl font-black text-emerald-800 font-mono mt-1">
              {tasks.filter((t) => t.status === 'Completed').length}
            </p>
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-white p-4 rounded-3xl border border-warm-200 shadow-2xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-charcoal-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700"
            >
              <option value="all">All Task Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-warm-50 border border-warm-300 rounded-lg px-2.5 py-1.5 font-medium text-charcoal-700"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>

        {/* TASKS LIST */}
        <div className="space-y-3">
          {filteredTasks.map((t) => (
            <div
              key={t.id}
              className={`p-5 rounded-3xl border transition-all ${
                t.status === 'Completed'
                  ? 'bg-warm-50/60 border-warm-200 opacity-70'
                  : 'bg-white border-warm-200 shadow-2xs hover:border-forest-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      t.status === 'Completed'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-warm-300 hover:border-forest-700'
                    }`}
                    title="Click to toggle status"
                  >
                    {t.status === 'Completed' && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`font-bold text-sm ${
                          t.status === 'Completed' ? 'line-through text-charcoal-500' : 'text-charcoal-900'
                        }`}
                      >
                        {t.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          t.priority === 'Critical'
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : t.priority === 'High'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-teal-100 text-teal-900 border border-teal-300'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </div>

                    {t.notes && <p className="text-xs text-charcoal-600 leading-relaxed">{t.notes}</p>}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-charcoal-400">
                      <span>Due: <strong>{new Date(t.due_date).toLocaleDateString()}</strong></span>
                      <span>•</span>
                      <span>Assigned to: <strong>{t.assigned_worker}</strong></span>
                      {t.related_dog_id && (
                        <>
                          <span>•</span>
                          <Link
                            href={`/dashboard/dogs/${t.related_dog_id}`}
                            className="text-forest-800 font-bold hover:underline"
                          >
                            Dog {t.related_dog_id} ({t.related_dog_name})
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className="px-3 py-1.5 rounded-xl border border-warm-300 text-xs font-semibold text-charcoal-700 hover:bg-warm-100"
                  >
                    Status: {t.status}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
