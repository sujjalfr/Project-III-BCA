import React, { useEffect, useMemo, useState, useRef } from "react";

export default function ManageStudent() {
  // Mock dynamic data -- replace with API fetch in future
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 8;
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    // replace with fetch('/api/students') real call
    const mock = Array.from({ length: 37 }).map((_, i) => ({
      id: i + 1,
      name: `Student ${i + 1}`,
      roll: `R-${1000 + i + 1}`,
      batch: `B${1 + ((i % 4) + 0)}`,
      department: ["CSE", "ECE", "MECH", "CIVIL"][i % 4],
      image: `https://i.pravatar.cc/40?img=${(i % 70) + 1}`,
    }));
    setStudents(mock);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.roll.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
    );
  }, [students, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageData = filtered.slice((page - 1) * perPage, page * perPage);

  function openNew() {
    setEditing({});
  }

  function openEdit(s) {
    setEditing({ ...s });
  }

  function saveEdit(payload) {
    if (!payload.id) {
      // create
      const id = students.length ? Math.max(...students.map((s) => s.id)) + 1 : 1;
      setStudents((cur) => [{ ...payload, id }, ...cur]);
    } else {
      // update
      setStudents((cur) => cur.map((s) => (s.id === payload.id ? payload : s)));
    }
    setEditing(null);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Manage Students</h2>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, roll or dept"
            className="border px-3 py-2 rounded"
          />
          <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded">Add Student</button>
        </div>
      </div>

      <div className="bg-white shadow rounded overflow-hidden">
        <table className="w-full table-auto text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Roll</th>
              <th className="p-2 text-left">Batch</th>
              <th className="p-2 text-left">Department</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((s) => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{s.id}</td>
                <td className="p-2 flex items-center gap-3">
                  <img src={s.image} alt="avatar" className="w-8 h-8 rounded-full" />
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.email || "—"}</div>
                  </div>
                </td>
                <td className="p-2">{s.roll}</td>
                <td className="p-2">{s.batch}</td>
                <td className="p-2">{s.department}</td>
                <td className="p-2 text-center">
                  <button onClick={() => openEdit(s)} className="text-sm text-blue-600">Edit</button>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-500">No students found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">Showing {filtered.length} result(s)</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded"
            disabled={page === 1}
          >
            Prev
          </button>
          <div className="px-2">{page} / {totalPages}</div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="px-3 py-1 border rounded"
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {editing && (
        <StudentModal initial={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
      )}
    </div>
  );
}

function StudentModal({ initial = {}, onClose, onSave }) {
  const [form, setForm] = useState({ name: "", roll: "", batch: "", department: "", image: null, ...initial });
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => setForm((f) => ({ ...f, ...initial })), [initial]);

  useEffect(() => {
    let stream;
    async function start() {
      if (!showCamera) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (e) {
        console.warn("Camera not available", e);
        setShowCamera(false);
      }
    }
    start();
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [showCamera]);

  function handleCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    setForm((f) => ({ ...f, image: dataUrl }));
    setShowCamera(false);
  }

  function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, image: reader.result }));
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg w-full max-w-2xl p-4">
        <h3 className="text-lg font-semibold mb-2">{form.id ? "Edit Student" : "Add Student"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Name" />
            <input value={form.roll} onChange={(e) => setForm({ ...form, roll: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Roll" />
            <input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Batch" />
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Department" />
            <div className="flex gap-2">
              <label className="flex-1">
                <div className="text-xs text-gray-600 mb-1">Upload image</div>
                <input type="file" accept="image/*" onChange={handleFile} />
              </label>
              <div className="flex-1">
                <div className="text-xs text-gray-600 mb-1">Or capture</div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCamera((s) => !s)} className="px-3 py-2 border rounded">{showCamera ? 'Close Camera' : 'Open Camera'}</button>
                  <button onClick={() => handleCapture()} disabled={!showCamera} className="px-3 py-2 bg-blue-600 text-white rounded">Capture</button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-gray-500">Preview</div>
            <div className="w-full h-48 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
              {showCamera ? (
                <div className="w-full h-full flex flex-col">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
              ) : form.image ? (
                <img src={form.image} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-xs text-gray-400">No image</div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={() => onSave(form)} className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>
    </div>
  );
}
