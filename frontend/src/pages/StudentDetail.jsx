import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Sidebar from "../components/Admin/Sidebar";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function formatDate(date) {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("en-GB");
  } catch {
    return date;
  }
}

function formatTimeForDisplay(value) {
  if (!value) return "—";
  // value may be ISO (2026-01-26T09:15:30) or time-only (09:15:30)
  try {
    if (String(value).includes("T")) {
      const timePart = String(value).split("T")[1] || "";
      return timePart.slice(0, 5);
    }
    // maybe "09:15:30" or "09:15"
    const parts = String(value).split(":");
    if (parts.length >= 2)
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
    return value;
  } catch {
    return value;
  }
}

/**
 * StudentDetail page
 *
 * Fixes:
 * - Uses native time inputs for editing attendance time (both today's attendance and historical records)
 * - Validates HH:MM and converts to an ISO-like datetime string payload expected by backend:
 *   `${date}T${HH:MM}:00`
 *   where `date` is record.date (if present) or today's date for today's attendance
 * - Updates `attendanceDetails.records` and today's `attendance` object locally after successful PATCH
 * - Defensive checks to avoid undefined state updates
 */
export default function StudentDetail() {
  const { rollNo } = useParams();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState(null); // today's attendance summary object
  const [error, setError] = useState("");

  const [inputRoll, setInputRoll] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [attForm, setAttForm] = useState(null); // used while editing today's attendance

  const [allDepartments, setAllDepartments] = useState([]);
  const [allBatches, setAllBatches] = useState([]);
  const [allClassGroups, setAllClassGroups] = useState([]);
  const [deptId, setDeptId] = useState("");
  const [batchId, setBatchId] = useState("");
  const [classGroupId, setClassGroupId] = useState("");

  const [attendanceDetails, setAttendanceDetails] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Editing a specific historical attendance record
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [editingTime, setEditingTime] = useState(""); // HH:MM
  const [editingDate, setEditingDate] = useState(""); // YYYY-MM-DD (used when building datetime payload)
  const [editError, setEditError] = useState("");

  // --- Load student and today's attendance summary ---
  useEffect(() => {
    async function load() {
      if (!rollNo) return;
      setLoading(true);
      setError("");
      try {
        const [sr, ar] = await Promise.all([
          axios.get(`${API_BASE}/api/students/?page_size=1000`),
          axios.get(`${API_BASE}/api/attendanceStatus/list/`),
        ]);
        const students = sr?.data?.results || [];
        const found = students.find(
          (s) => String(s.roll_no) === String(rollNo),
        );
        if (!found) {
          setError("Student not found");
          setStudent(null);
          setAttendance(null);
        } else {
          setStudent(found);
          const allAtt = ar?.data?.results || [];
          const todayAtt =
            allAtt.find((a) => String(a.roll_no) === String(rollNo)) || null;
          setAttendance(todayAtt);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load student data");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [rollNo]);

  // --- Attendance details (records) with optional date filter ---
  useEffect(() => {
    async function loadAttendanceDetails() {
      if (!rollNo) return;
      setAttendanceLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.append("date_from", dateFrom);
        if (dateTo) params.append("date_to", dateTo);
        const url = `${API_BASE}/api/student/${rollNo}/attendance/?${params.toString()}`;
        const resp = await axios.get(url);
        setAttendanceDetails(resp.data);
      } catch (e) {
        console.error("Failed to load attendance details:", e);
        setAttendanceDetails(null);
      } finally {
        setAttendanceLoading(false);
      }
    }

    loadAttendanceDetails();
  }, [rollNo, dateFrom, dateTo]);

  // --- Populate attForm when editing today's attendance ---
  useEffect(() => {
    if (attendance && isEditing) {
      setAttForm({
        status: attendance.status || "absent",
        // Normalize to HH:MM for time input if possible
        time: attendance.time ? formatTimeForDisplay(attendance.time) : "",
        alreadyMarked: !!attendance.alreadyMarked,
        class: attendance.class || "",
      });
    } else if (!isEditing) {
      setAttForm(null);
    }
  }, [attendance, isEditing]);

  // --- Lookups ---
  useEffect(() => {
    let mounted = true;
    async function loadLookups() {
      try {
        const [deps, batches, classes] = await Promise.all([
          axios.get(`${API_BASE}/api/departments/`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/batches/`).catch(() => ({ data: [] })),
          axios.get(`${API_BASE}/api/classgroups/`).catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        setAllDepartments(
          (deps.data || []).map((d) => ({ ...d, id: String(d.id) })),
        );
        setAllBatches(
          (batches.data || []).map((b) => ({ ...b, id: String(b.id) })),
        );
        setAllClassGroups(
          (classes.data || []).map((c) => ({
            ...c,
            id: String(c.id),
            department_id: String(c.department_id || ""),
            batch_id: String(c.batch_id || ""),
          })),
        );
      } catch (e) {
        if (!mounted) return;
        setAllDepartments([]);
        setAllBatches([]);
        setAllClassGroups([]);
      }
    }
    loadLookups();
    return () => {
      mounted = false;
    };
  }, []);

  // sync selected ids
  useEffect(() => {
    if (!student) return;
    setDeptId(student.department?.id ? String(student.department.id) : "");
    setBatchId(student.batch?.id ? String(student.batch.id) : "");
    setClassGroupId(
      student.class_group?.id ? String(student.class_group.id) : "",
    );
  }, [student]);

  const filteredBatches = useMemo(() => {
    if (!deptId) return allBatches;
    const classesInDept = allClassGroups.filter(
      (c) => String(c.department_id) === String(deptId),
    );
    const batchIds = new Set(
      classesInDept.map((c) => c.batch_id).filter(Boolean),
    );
    return allBatches.filter((b) => batchIds.has(String(b.id)));
  }, [deptId, allBatches, allClassGroups]);

  const filteredClassGroups = useMemo(() => {
    let filtered = allClassGroups;
    if (deptId)
      filtered = filtered.filter(
        (c) => String(c.department_id) === String(deptId),
      );
    if (batchId)
      filtered = filtered.filter((c) => String(c.batch_id) === String(batchId));
    return filtered;
  }, [deptId, batchId, allClassGroups]);

  // Helper: build datetime payload string expected by backend
  function buildDateTimePayload(datePart, hhmm) {
    // datePart expected as YYYY-MM-DD, hhmm as HH:MM
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm)) return null;
    const date = datePart || new Date().toISOString().slice(0, 10);
    return `${date}T${hhmm}:00`;
  }

  // --- Save student + today's attendance changes ---
  async function saveChanges() {
    if (!student?.id) return;
    setLoading(true);
    setError("");
    try {
      // Update student
      await axios.patch(`${API_BASE}/api/students/${student.id}/`, {
        name: student.name,
        roll_no: student.roll_no,
        department: deptId || null,
        batch: batchId || null,
        class_group: classGroupId || null,
      });

      // Update today's attendance if present and attForm exists
      if (attendance?.id && attForm) {
        let payloadTime = null;
        if (attForm.time) {
          // attForm.time is HH:MM from time input -> convert to full datetime using today's date
          payloadTime = buildDateTimePayload(
            new Date().toISOString().slice(0, 10),
            attForm.time,
          );
        }

        try {
          const resp = await axios.patch(
            `${API_BASE}/api/attendance/${attendance.id}/`,
            {
              status: attForm.status,
              time: payloadTime || null,
            },
          );
          // Update local today's attendance with returned values if any
          setAttendance((prev) =>
            prev
              ? {
                  ...prev,
                  status: resp.data.status ?? attForm.status,
                  time: resp.data.time ?? payloadTime,
                }
              : prev,
          );
        } catch (e) {
          console.warn("Attendance PATCH failed.", e);
          setError("Attendance save failed.");
        }
      }

      setIsEditing(false);
    } catch (e) {
      console.error("Save failed", e);
      setError("Save failed. Endpoint may be unavailable.");
    } finally {
      setLoading(false);
    }
  }

  const imageUrl = useMemo(() => {
    if (!student?.image) return "https://i.pravatar.cc/80?img=1";
    return `${API_BASE}/media/${student.image}`;
  }, [student]);

  // --- Edit a historical attendance record: prepare editing state ---
  const handleEditAttendance = (record) => {
    if (!record) return;
    // id might be `id` or `attendanceId` depending on API shape
    const aid = record.id || record.attendanceId || record.attendance_id;
    setEditingAttendanceId(aid);

    // set editingDate (use record.date if present)
    setEditingDate(record.date || "");

    // derive HH:MM for editingTime
    if (record.time) {
      const displayed = formatTimeForDisplay(record.time);
      // ensure it's HH:MM
      if (/^\d{2}:\d{2}$/.test(displayed)) setEditingTime(displayed);
      else setEditingTime("");
    } else {
      setEditingTime("");
    }
    setEditError("");
  };

  // --- Save edited historical attendance time ---
  const handleSaveAttendance = async () => {
    if (!editingAttendanceId || !editingTime) {
      setEditError("Please select a valid time");
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(editingTime)) {
      setEditError("Time must be in HH:MM format");
      return;
    }

    // Validate values
    const [h, m] = editingTime.split(":").map((v) => Number(v));
    if (
      Number.isNaN(h) ||
      Number.isNaN(m) ||
      h < 0 ||
      h > 23 ||
      m < 0 ||
      m > 59
    ) {
      setEditError("Invalid time");
      return;
    }

    try {
      setEditError("");
      const payloadTime = buildDateTimePayload(
        editingDate || new Date().toISOString().slice(0, 10),
        editingTime,
      );

      const resp = await axios.patch(
        `${API_BASE}/api/attendance/${editingAttendanceId}/`,
        { time: payloadTime },
        { headers: { "Content-Type": "application/json" } },
      );

      // Update attendanceDetails.records if present
      if (attendanceDetails && Array.isArray(attendanceDetails.records)) {
        const updated = attendanceDetails.records.map((r) => {
          const rid = r.id || r.attendanceId || r.attendance_id;
          if (String(rid) === String(editingAttendanceId)) {
            return { ...r, time: resp.data.time ?? payloadTime };
          }
          return r;
        });
        setAttendanceDetails({ ...attendanceDetails, records: updated });
      }

      // If this record is today's attendance summary object, update that too
      if (attendance && String(attendance.id) === String(editingAttendanceId)) {
        setAttendance((prev) =>
          prev ? { ...prev, time: resp.data.time ?? payloadTime } : prev,
        );
      }

      // clear editing state
      setEditingAttendanceId(null);
      setEditingTime("");
      setEditingDate("");
      setEditError("");
    } catch (err) {
      console.error("Attendance PATCH failed:", err);
      const errMsg =
        err?.response?.data?.time?.[0] ||
        err?.response?.data?.detail ||
        "Failed to update attendance";
      setEditError(errMsg);
    }
  };

  const handleCancelEdit = () => {
    setEditingAttendanceId(null);
    setEditingTime("");
    setEditingDate("");
    setEditError("");
  };

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Student Detail</h1>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(-1)}
                className="px-3 py-2 border rounded hover:bg-gray-100"
              >
                Back
              </button>
              {rollNo && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  disabled={loading}
                >
                  Edit
                </button>
              )}
              {rollNo && isEditing && (
                <>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setError("");
                      setAttForm(null);
                    }}
                    className="px-3 py-2 border rounded hover:bg-gray-100"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveChanges}
                    className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>

          {!rollNo && (
            <div className="bg-white p-4 rounded shadow">
              <div className="text-sm text-gray-600 mb-2">
                Enter roll number to view
              </div>
              <div className="flex gap-2">
                <input
                  value={inputRoll}
                  onChange={(e) => setInputRoll(e.target.value)}
                  placeholder="Roll No"
                  className="border px-3 py-2 rounded"
                />
                <button
                  onClick={() =>
                    inputRoll &&
                    navigate(`/admin/student/${String(inputRoll).trim()}`)
                  }
                  className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View
                </button>
              </div>
            </div>
          )}

          {rollNo && (
            <>
              <div className="bg-white p-6 rounded shadow">
                {loading ? (
                  <div className="text-gray-500 text-sm">Loading…</div>
                ) : error ? (
                  <div className="text-red-600 text-sm">{error}</div>
                ) : student ? (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-center">
                      <img
                        src={imageUrl}
                        alt="avatar"
                        className="w-24 h-24 rounded-lg object-cover bg-gray-100"
                        onError={(e) => {
                          e.target.src = "https://i.pravatar.cc/80?img=1";
                        }}
                      />
                      <div className="flex-1">
                        <div className="mb-2">
                          <label className="text-xs text-gray-500">Name</label>
                          <input
                            className="text-lg font-semibold border rounded px-2 py-1 w-full"
                            value={student.name || ""}
                            onChange={(e) =>
                              isEditing &&
                              setStudent((s) => ({
                                ...s,
                                name: e.target.value,
                              }))
                            }
                            readOnly={!isEditing}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Roll Number
                          </label>
                          <input
                            className="border rounded px-2 py-1 w-full"
                            value={student.roll_no || ""}
                            onChange={(e) =>
                              isEditing &&
                              setStudent((s) => ({
                                ...s,
                                roll_no: e.target.value,
                              }))
                            }
                            readOnly={!isEditing}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 border rounded">
                        <label className="text-xs text-gray-500 block mb-1">
                          Department
                        </label>
                        <select
                          className="text-sm border rounded px-2 py-1 w-full"
                          value={deptId}
                          onChange={(e) => {
                            if (!isEditing) return;
                            const val = e.target.value;
                            setDeptId(val);
                            setBatchId("");
                            setClassGroupId("");
                          }}
                          disabled={!isEditing}
                        >
                          <option value="">Select department</option>
                          {allDepartments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 border rounded">
                        <label className="text-xs text-gray-500 block mb-1">
                          Batch
                        </label>
                        <select
                          className="text-sm border rounded px-2 py-1 w-full"
                          value={batchId}
                          onChange={(e) => {
                            if (!isEditing) return;
                            const val = e.target.value;
                            setBatchId(val);
                            setClassGroupId("");
                          }}
                          disabled={!isEditing}
                        >
                          <option value="">Select batch</option>
                          {filteredBatches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="p-3 border rounded">
                        <label className="text-xs text-gray-500 block mb-1">
                          Class Group
                        </label>
                        <select
                          className="text-sm border rounded px-2 py-1 w-full"
                          value={classGroupId}
                          onChange={(e) => {
                            if (!isEditing) return;
                            setClassGroupId(e.target.value);
                          }}
                          disabled={!isEditing}
                        >
                          <option value="">Select class group</option>
                          {filteredClassGroups.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="p-3 border rounded">
                      <label className="text-sm text-gray-500 block mb-2">
                        Today's Attendance Status
                      </label>
                      {!isEditing && attendance ? (
                        <div className="text-sm space-y-1">
                          <div>
                            Status:{" "}
                            <span className="font-medium">
                              {attendance.status}
                            </span>
                          </div>
                          <div>
                            Time:{" "}
                            <span className="font-mono">
                              {attendance.time
                                ? formatTimeForDisplay(attendance.time)
                                : "—"}
                            </span>
                          </div>
                          <div>
                            Already Marked:{" "}
                            {attendance.alreadyMarked ? "Yes" : "No"}
                          </div>
                          <div>Class: {attendance.class || "—"}</div>
                        </div>
                      ) : !isEditing ? (
                        <div className="text-sm text-gray-500">
                          No attendance record for today.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <label className="text-xs text-gray-500">
                              Status
                            </label>
                            <select
                              className="w-full border rounded px-2 py-1"
                              value={attForm?.status || "absent"}
                              onChange={(e) =>
                                setAttForm((f) => ({
                                  ...f,
                                  status: e.target.value,
                                }))
                              }
                            >
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="on_time">On time</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Time
                            </label>
                            <input
                              type="time"
                              className="w-full border rounded px-2 py-1"
                              value={attForm?.time || ""}
                              onChange={(e) =>
                                setAttForm((f) => ({
                                  ...f,
                                  time: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!attForm?.alreadyMarked}
                              onChange={(e) =>
                                setAttForm((f) => ({
                                  ...f,
                                  alreadyMarked: e.target.checked,
                                }))
                              }
                            />
                            <span className="text-xs text-gray-500">
                              Already Marked
                            </span>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Class
                            </label>
                            <input
                              className="w-full border rounded px-2 py-1"
                              value={attForm?.class || ""}
                              onChange={(e) =>
                                setAttForm((f) => ({
                                  ...f,
                                  class: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No student data.</div>
                )}
              </div>

              {/* Attendance Details */}
              <div className="bg-white p-6 rounded shadow">
                <h2 className="text-lg font-semibold mb-4">
                  Attendance Summary
                </h2>

                {attendanceLoading ? (
                  <div className="text-gray-500 text-sm text-center py-8">
                    Loading attendance details…
                  </div>
                ) : attendanceDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xs text-gray-600">Total Days</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {attendanceDetails.total_days}
                        </div>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="text-xs text-gray-600">
                          Days Present
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {attendanceDetails.present_days}
                        </div>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-xs text-gray-600">Days Absent</div>
                        <div className="text-2xl font-bold text-red-600">
                          {attendanceDetails.absent_days}
                        </div>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div className="text-xs text-gray-600">On Time</div>
                        <div className="text-2xl font-bold text-emerald-600">
                          {attendanceDetails.on_time_days}
                        </div>
                      </div>
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-xs text-gray-600">Late</div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {attendanceDetails.late_days}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 rounded-lg border">
                      <div className="text-sm font-semibold mb-3">
                        Filter by Date Range
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">
                            From Date
                          </label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600 block mb-1">
                            To Date
                          </label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              setDateFrom("");
                              setDateTo("");
                            }}
                            className="w-full px-3 py-2 text-sm bg-gray-300 hover:bg-gray-400 rounded text-gray-700 font-medium"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-semibold mb-3">
                        Attendance Records (
                        {attendanceDetails.records?.length || 0})
                      </div>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-100 border-b">
                              <th className="px-4 py-3 text-left font-semibold">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Time
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Status
                              </th>
                              <th className="px-4 py-3 text-left font-semibold">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendanceDetails.records &&
                            attendanceDetails.records.length > 0 ? (
                              attendanceDetails.records.map((record, idx) => {
                                const rid =
                                  record.id ||
                                  record.attendanceId ||
                                  record.attendance_id;
                                const isThisEditing =
                                  String(rid) === String(editingAttendanceId);
                                return (
                                  <tr
                                    key={idx}
                                    className="border-b hover:bg-gray-50 transition"
                                  >
                                    <td className="px-4 py-3">
                                      {formatDate(record.date)}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-700">
                                      {isThisEditing ? (
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="time"
                                            value={editingTime}
                                            onChange={(e) =>
                                              setEditingTime(e.target.value)
                                            }
                                            className="border rounded px-2 py-1"
                                          />
                                          <button
                                            onClick={handleSaveAttendance}
                                            className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={handleCancelEdit}
                                            className="px-2 py-1 border rounded text-xs"
                                          >
                                            Cancel
                                          </button>
                                          {editError && (
                                            <div className="text-xs text-red-600">
                                              {editError}
                                            </div>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <span>
                                            {record.time
                                              ? formatTimeForDisplay(
                                                  record.time,
                                                )
                                              : "—"}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                          record.status === "on_time"
                                            ? "bg-green-100 text-green-800"
                                            : record.status === "late"
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-red-100 text-red-800"
                                        }`}
                                      >
                                        {String(record.status || "")
                                          .replace("_", " ")
                                          .toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      {!isThisEditing && (
                                        <button
                                          onClick={() => {
                                            // populate editingDate from record.date for payload construction
                                            setEditingDate(record.date || "");
                                            handleEditAttendance(record);
                                          }}
                                          className="px-2 py-1 border rounded text-xs"
                                        >
                                          Edit Time
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td
                                  colSpan="4"
                                  className="px-4 py-6 text-center text-gray-500"
                                >
                                  No attendance records found for the selected
                                  date range.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {attendanceDetails.total_days > 0 && (
                      <div className="p-4 bg-gray-50 rounded-lg border">
                        <div className="text-sm font-semibold mb-2">
                          Attendance Percentage
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-green-600 h-3 rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.round((attendanceDetails.present_days / attendanceDetails.total_days) * 100)}%`,
                            }}
                          />
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round(
                            (attendanceDetails.present_days /
                              attendanceDetails.total_days) *
                              100,
                          )}
                          % attendance
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm text-center py-8">
                    No attendance details available.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
