import React, { useEffect, useState } from "react";
import Sidebar from "../components/Admin/Sidebar";
import axios from "axios";

export default function AdminSettings() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settings, setSettings] = useState({
    requireFaceEncoding: true,
    autoGenerateQR: true,
    attendanceThreshold: 75,
    adminEmail: "",
  });
  const [currPin, setCurrPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");

  const DEFAULT_PIN = "12345";
  function getAdminPin() {
    return localStorage.getItem("admin_pin") || DEFAULT_PIN;
  }
  function setAdminPin(pin) {
    localStorage.setItem("admin_pin", pin);
  }

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

  async function changePin() {
    setPinMsg("");
    if (!/^\d{5}$/.test(newPin)) {
      setPinMsg("New PIN must be 5 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setPinMsg("PINs do not match");
      return;
    }
    try {
      const resp = await axios.post(`${process.env.VITE_API_BASE || "http://127.0.0.1:8000"}/api/admin/pin/`, {
        current_pin: currPin,
        pin: newPin,
      });
      if (resp.data && resp.data.message) {
        setPinMsg(resp.data.message || "PIN updated");
        // fetch token after update to keep client authenticated
        try {
          const auth = await axios.post(`${process.env.VITE_API_BASE || "http://127.0.0.1:8000"}/api/admin/auth/`, { pin: newPin });
          if (auth.data && auth.data.token) {
            localStorage.setItem("admin_token", auth.data.token);
            try { sessionStorage.setItem("admin_authenticated", "1"); } catch (e) {}
          }
        } catch {}
      }
    } catch (e) {
      // fallback: show error and do not change
      const msg = e?.response?.data?.error || e?.response?.data?.detail || "Failed to update PIN";
      setPinMsg(String(msg));
    } finally {
      setCurrPin("");
      setNewPin("");
      setConfirmPin("");
    }
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

          <div className="bg-white p-4 rounded shadow mt-4">
            <h2 className="font-semibold mb-2">Admin PIN</h2>
            <div className="text-sm text-gray-500 mb-2">Change the 5-digit admin PIN used to access admin pages.</div>
            <input className="w-full border px-2 py-1 mb-2" placeholder="Current PIN" value={currPin} onChange={(e)=>setCurrPin(e.target.value.replace(/[^\d]/g,"").slice(0,5))} inputMode="numeric" />
            <input className="w-full border px-2 py-1 mb-2" placeholder="New PIN (5 digits)" value={newPin} onChange={(e)=>setNewPin(e.target.value.replace(/[^\d]/g,"").slice(0,5))} inputMode="numeric" />
            <input className="w-full border px-2 py-1 mb-2" placeholder="Confirm New PIN" value={confirmPin} onChange={(e)=>setConfirmPin(e.target.value.replace(/[^\d]/g,"").slice(0,5))} inputMode="numeric" />
            {pinMsg && <div className="text-sm text-green-600 mb-2">{pinMsg}</div>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setCurrPin(""); setNewPin(""); setConfirmPin(""); setPinMsg(""); }} className="px-3 py-1 border rounded">Cancel</button>
              <button onClick={changePin} className="px-3 py-1 bg-green-600 text-white rounded">Change PIN</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
