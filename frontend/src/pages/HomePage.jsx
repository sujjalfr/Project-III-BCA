import React, { useEffect, useState } from "react";
import ChainedSelects from "../components/Admin/StudentManagement/ChainedSelects";
import Sidebar from "../components/Admin/Sidebar";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
  useEffect(() => {
    console.log("Attendance Status Updated:", showAttendanceStatus, students);
  }, [showAttendanceStatus, students]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      // mock metrics + students — replace with real API call
      setMetrics({
        attendance: 92,
        attendanceDelta: -1.2,
        activeStudents: 312,
        scansPerHour: [5, 12, 20, 14, 8, 6, 3],
      });

      // setStudents([
      //   {
      //     id: 1,
      //     name: "Aisha Khan",
      //     class: "10A",
      //     status: "on_time",
      //     timeIn: "08:45",
      //   },
      //   {
      //     id: 2,
      //     name: "Ravi Patel",
      //     class: "10B",
      //     status: "late",
      //     timeIn: "09:20",
      //   },
      //   { id: 3, name: "Maya Singh", class: "10A", status: "absent" },
      //   {
      //     id: 4,
      //     name: "Arjun Rao",
      //     class: "10C",
      //     status: "on_time",
      //     timeIn: "08:50",
      //   },
      //   {
      //     id: 5,
      //     name: "Zara Ali",
      //     class: "10B",
      //     status: "late",
      //     timeIn: "09:05",
      //   },
      //   { id: 6, name: "Kabir Shah", class: "10A", status: "absent" },
      // ]);

      setLastUpdated(new Date());
      setLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, [range]);

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

  const filtered = showAttendanceStatus.filter((s) => {
    if (showAbsentOnly && s.status !== "absent") return false;
    if (showLateOnly && s.status !== "late") return false;
    if (
      search &&
      !`${s.name} ${s.class}`.toLowerCase().includes(search.toLowerCase())
    )
      return false;
    return true;
  });

  const absentCount = students.filter((s) => s.status === "absent").length;
  const lateCount = students.filter((s) => s.status === "late").length;

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
          <div style={{ fontSize: 12, color: "#666" }}>Scans / hour</div>
          {metrics ? (
            <Sparkline points={metrics.scansPerHour} width={220} />
          ) : (
            <div style={{ height: 30 }} />
          )}
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
            onChange={({ deptId, batchId, classGroupId }) => {
              // optional: fetch students for the selected class/batch
              // e.g. fetch(`/api/students?class=${classGroupId}&batch=${batchId}`)...
            }}
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
            {/* {console.log(students)} */}
            {filtered.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "10px 6px" }}>{s.name}</td>
                <td style={{ padding: "10px 6px" }}>{s.class}</td>
                <td style={{ padding: "10px 6px" }}>
                  <StatusBadge status={s.status} />
                </td>
                <td style={{ padding: "10px 6px" }}>
                  {s.time
                    ? new Date(s.time).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
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
