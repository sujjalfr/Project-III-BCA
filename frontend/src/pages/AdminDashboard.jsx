import React, { useEffect, useState } from 'react'
import KpiCard from '../components/Admin/KpiCard'
import SimpleLineChart from '../components/Admin/SimpleLineChart'
import axios from 'axios'

export default function AdminDashboard() {
  const [range, setRange] = useState('7d')
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(false)

  // Mocked local data for small demo
  const mock = {
    dailyAttendancePct: 92,
    dailyAttendanceDelta: -1.2,
    scansPerHour: [5, 12, 20, 14, 8, 6, 3],
    activeStudents: 312,
  }

  useEffect(() => {
    setLoading(true)
    // Example: fetch real metrics from backend
    // axios.get(`/api/admin/metrics?range=${range}`).then(r => setMetrics(r.data)).finally(() => setLoading(false))

    // For demo, use mock with a small timeout
    setTimeout(() => {
      setMetrics(mock)
      setLoading(false)
    }, 300)
  }, [range])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <select value={range} onChange={(e) => setRange(e.target.value)} className="border rounded px-2 py-1">
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Attendance % (today)" value={metrics ? `${metrics.dailyAttendancePct}%` : '—'} delta={metrics ? metrics.dailyAttendanceDelta : undefined} subtitle={loading ? 'Loading…' : 'Compared to yesterday'} />
        <KpiCard title="Active Students" value={metrics ? metrics.activeStudents : '—'} subtitle="Currently active in the system" />
        <div className="col-span-1 sm:col-span-2 lg:col-span-2 bg-white p-4 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Scans per hour</div>
          <div className="mt-2">
            {metrics ? <SimpleLineChart data={metrics.scansPerHour} width={500} height={100} /> : <div className="text-xs text-gray-400">Loading chart…</div>}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="text-sm text-gray-500">Activity feed</div>
        <div className="mt-3 text-xs text-gray-600">Recent scans and events will appear here (implement pagination and server feed)</div>
      </div>
    </div>
  )
}