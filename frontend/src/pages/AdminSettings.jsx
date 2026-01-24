import React, { useEffect, useState } from "react";
import Sidebar from "../components/Admin/Sidebar";

export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState({
    requireFaceEncoding: true,
    autoGenerateQR: true,
    attendanceThreshold: 75,
    adminEmail: "",
  });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("admin_settings") || "null");
      if (saved) setSettings(saved);
    } catch (e) {}
  }, []);

  function save() {
    localStorage.setItem("admin_settings", JSON.stringify(settings));
    alert("Settings saved");
  }

  return (
    <div className="flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">Admin Settings</h1>

          <div className="bg-white p-4 rounded shadow space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Require Face Encoding</div>
                <div className="text-sm text-gray-500">If enabled, uploaded faces will be encoded for recognition.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.requireFaceEncoding}
                onChange={(e) => setSettings((s) => ({ ...s, requireFaceEncoding: e.target.checked }))}
                className="w-5 h-5"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Auto-generate QR</div>
                <div className="text-sm text-gray-500">Automatically create student QR codes on save.</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoGenerateQR}
                onChange={(e) => setSettings((s) => ({ ...s, autoGenerateQR: e.target.checked }))}
                className="w-5 h-5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Attendance Threshold (%)</label>
              <input
                type="number"
                value={settings.attendanceThreshold}
                onChange={(e) => setSettings((s) => ({ ...s, attendanceThreshold: Number(e.target.value || 0) }))}
                className="mt-1 block w-32 border rounded px-2 py-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Admin Contact Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => setSettings((s) => ({ ...s, adminEmail: e.target.value }))}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="admin@school.edu"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => window.location.reload()} className="px-3 py-2 border rounded">Reset</button>
              <button onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded">Save Settings</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
