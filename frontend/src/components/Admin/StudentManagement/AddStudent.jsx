import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AddStudent() {
  const [form, setForm] = useState({ name: "", roll: "", batch: "", department: "", image: null });
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

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
      if (stream) stream?.getTracks().forEach((t) => t.stop());
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

  function save() {
    // read existing list, prepend the new student, persist
    try {
      const saved = JSON.parse(localStorage.getItem("students") || "[]");
      const id = saved.length ? Math.max(...saved.map((s) => s.id)) + 1 : 1;
      const payload = { ...form, id };
      const next = [payload, ...saved];
      localStorage.setItem("students", JSON.stringify(next));
    } catch (e) {
      console.warn(e);
    }
    // go back to list
    navigate("/admin/students");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add Student</h1>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-3 py-2 border rounded">Cancel</button>
          <button onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded">Save</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow">
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Name" />
          <input value={form.roll} onChange={(e) => setForm({ ...form, roll: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Roll" />
          <input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Batch" />
          <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full border px-3 py-2 rounded" placeholder="Department" />

          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Upload image</label>
            <input type="file" accept="image/*" onChange={handleFile} />
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={() => setShowCamera((s) => !s)} className="px-3 py-2 border rounded">{showCamera ? 'Close Camera' : 'Open Camera'}</button>
            <button onClick={handleCapture} disabled={!showCamera} className="px-3 py-2 bg-blue-600 text-white rounded">Capture</button>
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-500 mb-2">Preview</div>
          <div className="w-full h-64 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
            {showCamera ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : form.image ? (
              <img src={form.image} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-xs text-gray-400">No image selected</div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
}
