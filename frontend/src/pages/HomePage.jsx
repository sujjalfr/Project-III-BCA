import React, { useEffect, useState, useCallback } from "react";
import ChainedSelects from "../components/Admin/StudentManagement/ChainedSelects";
import Sidebar from "../components/Admin/Sidebar";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { formatNPTOrDash } from "../utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE;

const KpiCard = ({ title, value, delta }) => (
  <div
    style={{
      padding: 12,
      borderRadius: 8,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      background: "#fff",
      minWidth: 160,
    }}
  >
    <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
    <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    {delta !== undefined && (
      <div style={{ fontSize: 12, color: delta >= 0 ? "#0a0" : "#c00" }}>
        {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}%
      </div>
    )}
  </div>
);

const Sparkline = ({
  points = [5, 10, 8, 12, 6],
  width = 120,
  height = 30,
}) => {
  const max = Math.max(...points, 1);
  const step = width / Math.max(1, points.length - 1);
  const path = points
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"} ${i * step} ${height - (p / max) * height}`,
    )
    .join(" ");
  return (
    <svg width={width} height={height}>
      <path
        d={path}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    absent: { text: "Absent", color: "#ef4444" },
    late: { text: "Late", color: "#f59e0b" },
    on_time: { text: "On time", color: "#10b981" },
  };
  const s = map[status] || { text: status, color: "#6b7280" };
  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        background: s.color + "22",
        color: s.color,
        fontSize: 12,
      }}
    >
      {s.text}
    </span>
  );
};

function HomePage() {
  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [showAttendanceStatus, setShowAttendanceStatus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState("7d");
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();

  // filters
  const [showAbsentOnly, setShowAbsentOnly] = useState(false);
  const [showLateOnly, setShowLateOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Add filters state
  const [filters, setFilters] = useState({ deptId: '', batchId: '', classGroupId: '' });

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE}/api/students/`)
      .then((r) => {
        if (!mounted) return;
        setStudents(
          (r.data.results || []).map((d) => ({ ...d, id: String(d.id) })),
        );
      })
      .catch(() => setStudents([]));
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch data
  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE}/api/attendanceStatus/list/`)
      .then((r) => {
        if (!mounted) return;
        setShowAttendanceStatus(
          (r.data.results || []).map((d) => ({ ...d, id: String(d.id) })),
        );
      })
      .catch((err) => {
        console.error("Failed to fetch attendance status:", err);
        setShowAttendanceStatus([]);
      });
    return () => {
      mounted = false;
    };
  }, []);
  // useEffect(() => {
  //   console.log("Attendance Status Updated:", showAttendanceStatus, students);
  // }, [showAttendanceStatus, students]);

  useEffect(() => {
    setLoading(true);
    // Calculate metrics from attendance data
    const calculateMetrics = () => {
      if (showAttendanceStatus.length === 0 || students.length === 0) {
        setMetrics(null);
        setLoading(false);
        return;
      }

      // Count attendance statistics for today
      const presentCount = showAttendanceStatus.filter(s => s.alreadyMarked).length;
      const absentCount = showAttendanceStatus.filter(s => !s.alreadyMarked).length;
      const lateCount = showAttendanceStatus.filter(s => s.status === 'late').length;
      const onTimeCount = showAttendanceStatus.filter(s => s.status === 'on_time').length;

      const totalStudents = showAttendanceStatus.length || 1;
      const attendancePercent = Math.round((presentCount / totalStudents) * 100);

      // Calculate scans per hour (mock distribution for today)
      const now = new Date();
      const scansPerHour = [];
      for (let i = 0; i < 24; i++) {
        const hour = i;
        const hourScans = showAttendanceStatus.filter(s => {
          if (!s.time) return false;
          try {
            const scanTime = new Date(s.time);
            return scanTime.getHours() === hour;
          } catch {
            return false;
          }
        }).length;
        scansPerHour.push(hourScans);
      }

      setMetrics({
        attendance: attendancePercent,
        attendanceDelta: attendancePercent >= 90 ? 2.5 : -1.2, // mock delta
        activeStudents: presentCount,
        totalStudents: totalStudents,
        absentCount: absentCount,
        lateCount: lateCount,
        onTimeCount: onTimeCount,
        scansPerHour: scansPerHour,
      });
      setLoading(false);
    };

    const timer = setTimeout(() => {
      calculateMetrics();
    }, 300);

    return () => clearTimeout(timer);
  }, [showAttendanceStatus, range]);

  const refresh = () => {
    // replace with real fetch to update metrics + students:
    // setLoading(true);
    // fetch(`/api/admin/home-metrics?range=${range}`).then(r=>r.json()).then(data=>{ setMetrics(data.metrics); setStudents(data.students); setLastUpdated(new Date()); }).finally(()=>setLoading(false));
    setLoading(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setLoading(false);
    }, 300);
  };

  // Apply all filters together
  const filtered = showAttendanceStatus.filter((s) => {
    // Find corresponding student to get department/batch/class info
    const student = students.find(st => st.roll_no === s.roll_no);
    
    // Status filters (absent/late)
    if (showAbsentOnly && s.status !== "absent") return false;
    if (showLateOnly && s.status !== "late") return false;
    
    // Search filter
    if (search && !`${s.name} ${s.class || ''}`.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    
    // Department/Batch/Class filters
    if (student) {
      if (filters.deptId && String(student.department?.id || '') !== String(filters.deptId)) {
        return false;
      }
      if (filters.batchId && String(student.batch?.id || '') !== String(filters.batchId)) {
        return false;
      }
      if (filters.classGroupId && String(student.class_group?.id || '') !== String(filters.classGroupId)) {
        return false;
      }
    } else if (filters.deptId || filters.batchId || filters.classGroupId) {
      // If filters are active but student not found, exclude this record
      return false;
    }
    
    return true;
  });

  const absentCount = metrics?.absentCount || 0;
  const lateCount = metrics?.lateCount || 0;

  // Memoize the filter change handler
  const handleFilterChange = useCallback((filterValues) => {
    setFilters(filterValues);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Admin HomePage</h2>
        <div>
          <button
            onClick={() => navigate("/admin")}
            className="mr-22 bg-red-600 p-2 rounded-md"
          >
            Admin Dashboard
          </button>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            style={{ marginRight: 8 }}
          >
            <option value="24h">Last 24h</option>
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
          </select>
          <button onClick={refresh} style={{ marginRight: 8 }}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div
        style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}
      >
        <KpiCard
          title="Attendance %"
          value={metrics ? `${metrics.attendance}%` : "—"}
          delta={metrics ? metrics.attendanceDelta : undefined}
        />
        <KpiCard
          title="Active Students"
          value={metrics ? metrics.activeStudents : "—"}
        />
        <KpiCard title="Absent" value={absentCount} />
        <KpiCard title="Late arrivals" value={lateCount} />
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            background: "#fff",
            minWidth: 260,
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>Scans / hour (today)</div>
          {metrics ? (
            <Sparkline points={metrics.scansPerHour.slice(6, 18)} width={220} height={40} />
          ) : (
            <div style={{ height: 30 }} />
          )}
          <div style={{ fontSize: 10, color: "#999", marginTop: 4 }}>
            Total scans: {metrics ? metrics.scansPerHour.reduce((a, b) => a + b, 0) : 0}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <ChainedSelects
            onChange={handleFilterChange}
          />
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={showAbsentOnly}
              onChange={(e) => {
                setShowAbsentOnly(e.target.checked);
                if (e.target.checked) setShowLateOnly(false);
              }}
            />{" "}
            Show absent
          </label>
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={showLateOnly}
              onChange={(e) => {
                setShowLateOnly(e.target.checked);
                if (e.target.checked) setShowAbsentOnly(false);
              }}
            />{" "}
            Show late
          </label>
          <input
            placeholder="Search name or class"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
            }}
          />
        </div>

        <div style={{ fontSize: 12, color: "#666" }}>
          {lastUpdated
            ? `Updated ${Math.round((Date.now() - lastUpdated.getTime()) / 60000)}m ago`
            : "Loading..."}
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                fontSize: 13,
                color: "#374151",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <th style={{ padding: "8px 6px" }}>Student</th>
              <th style={{ padding: "8px 6px", width: 120 }}>Class</th>
              <th style={{ padding: "8px 6px", width: 120 }}>Status</th>
              <th style={{ padding: "8px 6px", width: 120 }}>Time In</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 12, color: "#6b7280" }}>
                  No students match filters.
                </td>
              </tr>
            )}
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 6px" }}>{s.name}</td>
                <td style={{ padding: "10px 6px" }}>{s.class}</td>
                <td style={{ padding: "10px 6px" }}>
                  <StatusBadge status={s.status} />
                </td>
                <td style={{ padding: "10px 6px" }}>
                  {formatNPTOrDash(s.time)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HomePage;
