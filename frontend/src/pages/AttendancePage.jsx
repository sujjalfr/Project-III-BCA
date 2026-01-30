import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChooseMethod from "../components/common/ChooseMethod";
import QRScanner from "../components/QR/QRScanner";
import ManualRollInput from "../components/common/ManualRollInput";
import FaceScan from "../components/FaceScan/FaceScan";
import AttendanceResult from "../components/Attendance/AttendanceResult";
import { formatNPTOrDash, formatTimeForDisplay } from "../utils/helpers";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const DEFAULT_PIN = "12345";
function getAdminPin() {
  return localStorage.getItem("admin_pin") || DEFAULT_PIN;
}
function setAdminPin(pin) {
  localStorage.setItem("admin_pin", pin);
}

const AttendancePage = () => {
  const [step, setStep] = useState("choose");
  const [rollNo, setRollNo] = useState("");
  const [result, setResult] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const [lastAttendance, setLastAttendance] = useState(null);
  const navigate = useNavigate();

  // Exit PIN modal state
  const [showExitPinModal, setShowExitPinModal] = useState(false);
  const [exitPin, setExitPin] = useState("");
  const [exitError, setExitError] = useState("");

  const handleChoose = (method) => setStep(method);

  const handleQRScan = async (data) => {
    if (data) {
      setRollNo(data);

      if (autoScan) {
        try {
          const response = await fetch(
            `${API_BASE}/api/attendanceStatus/?roll_no=${encodeURIComponent(
              data,
            )}`,
          );
          const status = await response.json();
          if (status.alreadyMarked) {
            // Show message and reset for next scan
            setLastAttendance({
              success: false,
              rollNo: data,
              name: status.name || "",
              error: true,
            });
            setTimeout(() => {
              setRollNo("");
              setResult(null);
              setStep("qr");
            }, 2000); // Show message for 2 seconds
          } else {
            setStep("face");
          }
        } catch (err) {
          // On error, fall back to face scan
          console.log(err);
          setStep("face");
        }
      } else {
        setStep("face");
      }
    }
  };

  const handleManualSubmit = (roll) => {
    setRollNo(roll);
    if (autoScan) {
      (async () => {
        try {
          const response = await fetch(
            `${API_BASE}/api/attendanceStatus/?roll_no=${encodeURIComponent(
              roll,
            )}`,
          );
          const status = await response.json();
          if (status.alreadyMarked) {
            setLastAttendance({
              success: false,
              rollNo: roll,
              name: status.name || "",
              error: true,
            });
            setTimeout(() => {
              setRollNo("");
              setResult(null);
              setStep("qr");
            }, 2000);
            return;
          }
          setStep("face");
        } catch (err) {
          // console.log(err);
          setStep("face");
        }
      })();
    } else {
      setStep("face");
    }
  };

  const handleFaceScanResult = (scanResult) => {
    setResult(scanResult);
    setStep("result");
  };

  const handleRescanFace = () => {
    setResult(null);
    setStep("face");
  };

  const handleRescanQR = () => {
    setResult(null);
    setRollNo("");
    setStep("qr");
  };

  const handleReenterRoll = () => {
    setResult(null);
    setRollNo("");
    setStep("manual");
  };

  const handleStartOver = () => {
    setStep("choose");
    setRollNo("");
    setResult(null);
  };

  // When autoScan is enabled, always start at QR scan
  useEffect(() => {
    if (autoScan) {
      setStep("qr");
      setRollNo("");
      setResult(null);
    } else {
      setStep("choose");
    }
  }, [autoScan]);

  // When result is set in auto mode, show it briefly then return to QR scan
  useEffect(() => {
    if (autoScan && result) {
      setLastAttendance(result); // Save last successful attendance
      const timer = setTimeout(() => {
        setStep("qr");
        setRollNo("");
        setResult(null);
      }, 2000); // Show result for 2 seconds
      return () => clearTimeout(timer);
    }
  }, [result, autoScan]);

  // --- Admin auth helpers (use axios to call backend) ---
  const attemptServerAuth = async (pin) => {
    try {
      const resp = await axios.post(`${API_BASE}/api/admin/auth/`, { pin });
      if (resp?.data?.token) {
        localStorage.setItem("admin_token", resp.data.token);
        try { sessionStorage.setItem("admin_authenticated", "1"); } catch (e) {}
        return { ok: true };
      }
      return { ok: false, error: resp?.data?.error || "Invalid PIN" };
    } catch (err) {
      return { ok: false, unreachable: true };
    }
  };

  const handleAdminEnter = async () => {
    setExitError("");
    if (!/^\d{5}$/.test(exitPin)) {
      setExitError("Enter a 5-digit numeric code");
      return;
    }
    const res = await attemptServerAuth(exitPin);
    if (res.ok) {
      setShowExitPinModal(false);
      setExitPin("");
      setExitError("");
      navigate("/home");
      return;
    }
    if (res.unreachable) {
      // fallback local check if server unreachable
      if (exitPin === getAdminPin()) {
        try { sessionStorage.setItem("admin_authenticated", "1"); } catch (e) {}
        setShowExitPinModal(false);
        setExitPin("");
        setExitError("");
        navigate("/home");
        return;
      }
      setExitError("Server unreachable and local PIN did not match");
      return;
    }
    setExitError(res.error || "Invalid PIN");
  };

  // Add keyboard support while modal is open (digits, Backspace, Enter, Escape)
  useEffect(() => {
    if (!showExitPinModal) return;
    const handler = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        setExitPin((p) => (p + e.key).slice(0, 5));
      } else if (e.key === "Backspace") {
        setExitPin((p) => p.slice(0, -1));
      } else if (e.key === "Enter") {
        handleAdminEnter();
      } else if (e.key === "Escape") {
        setShowExitPinModal(false);
        setExitPin("");
        setExitError("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showExitPinModal, handleAdminEnter]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div style={{ position: "absolute", left: 12, top: 12, zIndex: 60 }}>
        <button
          onClick={() => setShowExitPinModal(true)}
          className="px-3 py-1 bg-red-500 text-white rounded"
        >
          Exit
        </button>
      </div>
      {showExitPinModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="bg-black/50 absolute inset-0"
            onClick={() => {
              setShowExitPinModal(false);
              setExitPin("");
              setExitError("");
            }}
          />
          <div className="bg-white p-4 rounded shadow-md z-60 w-80">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">
                {"Enter 5-digit PIN"}
              </div>
            </div>

            {/* Masked PIN display / keypad for entry mode */}
            <>
              <div className="mb-3 text-center font-mono text-xl tracking-widest">
                {`${"•".repeat(exitPin.length)}${"○".repeat(5 - exitPin.length)}`}
              </div>
              {exitError && <div className="text-sm text-red-600 mb-2">{exitError}</div>}

              {/* Numeric keypad */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {["1","2","3","4","5","6","7","8","9"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setExitPin((p) => (p + n).slice(0,5))}
                    className="px-3 py-2 border rounded text-lg bg-gray-50"
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setExitPin("")}
                  className="px-3 py-2 border rounded text-lg bg-yellow-50"
                >
                  C
                </button>
                <button
                  type="button"
                  onClick={() => setExitPin((p) => (p + "0").slice(0,5))}
                  className="px-3 py-2 border rounded text-lg bg-gray-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setExitPin((p) => p.slice(0, -1))}
                  className="px-3 py-2 border rounded text-lg bg-yellow-50"
                >
                  ⌫
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowExitPinModal(false); setExitPin(""); setExitError(""); }}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdminEnter}
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                >
                  Enter
                </button>
              </div>
            </>
          </div>
        </div>
      )}
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
        {/* Auto Scan Toggle Button */}
        <button
          onClick={() => setAutoScan((prev) => !prev)}
          className={`mb-4 px-4 py-2 rounded font-bold ${
            autoScan ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Auto Scan
        </button>
        <button
          onClick={() => setStep("qr")}
          className={`mb-4 px-4 py-2 rounded font-bold ${
            autoScan ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          QR Scan
        </button>
        <button
          videoconstraints={{ facingMode: "user" }}
          onClick={() => {
            setRollNo("");
            setStep("manual");
          }}
          className={`mb-4 px-4 py-2 rounded font-bold ${
            autoScan ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
          }`}
        >
          Manual RollNo
        </button>
        {autoScan ? (
          <>
            {step === "qr" && (
              <>
                <QRScanner onScan={handleQRScan} />
                {lastAttendance && (
                  <div className="mt-4 p-2 bg-green-100 rounded">
                    <strong>Last Attendance:</strong>
                    <div>Name: {lastAttendance.name || "N/A"}</div>
                    <div>
                      Roll No:{" "}
                      {lastAttendance.rollNo ||
                        lastAttendance.rollNoScanned ||
                        "N/A"}
                    </div>
                    <div>
                      Class:{" "}
                      {lastAttendance.class ||
                        lastAttendance.classGroup ||
                        lastAttendance.className ||
                        "N/A"}
                    </div>
                    <div>
                      Batch:{" "}
                      {lastAttendance.batch ||
                        lastAttendance.batchYear ||
                        "N/A"}
                    </div>
                    <div>
                      Department:{" "}
                      {lastAttendance.department ||
                        lastAttendance.departmentName ||
                        "N/A"}
                    </div>
                    <div>
                      Time:{" "}
                      {formatTimeForDisplay(
                        lastAttendance.time ||
                        lastAttendance.timeIn ||
                        lastAttendance.timestamp
                      )}
                    </div>
                    <div>
                      Status: {lastAttendance.success ? "✓ Marked" : "✗ Failed"}
                    </div>
                  </div>
                )}
                {lastAttendance && (
                  <div
                    className={`mt-4 p-2 rounded ${lastAttendance.success ? "bg-green-100" : "bg-yellow-100"}`}
                  >
                    {lastAttendance.error
                      ? `Attendance already done for Roll No: ${lastAttendance.rollNo || lastAttendance.rollNoScanned || ""}`
                      : `Attendance marked for ${lastAttendance.name || ""} (${lastAttendance.rollNo || ""}) - ${lastAttendance.class || lastAttendance.classGroup || ""} / ${lastAttendance.batch || lastAttendance.batchYear || ""}`}
                  </div>
                )}
              </>
            )}
            {step === "manual" && (
              <ManualRollInput onSubmit={handleManualSubmit} />
            )}
            {step === "face" && (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    className="px-3 py-1 bg-gray-200 rounded"
                    onClick={() => {
                      setStep("qr");
                      setRollNo("");
                    }}
                  >
                    Back to QR
                  </button>
                  <button
                    className="px-3 py-1 bg-yellow-200 rounded"
                    onClick={() => setAutoScan(false)}
                  >
                    Stop AutoScan
                  </button>
                </div>
                {rollNo ? (
                  <FaceScan
                    rollNo={rollNo}
                    onResult={handleFaceScanResult}
                    autoScan={autoScan}
                  />
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            {step === "choose" && (
              <div className="flex flex-col gap-2 mb-4">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                  onClick={() => setStep("qr")}
                >
                  QR Scan Again
                </button>
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded"
                  onClick={() => setStep("manual")}
                >
                  Manual Roll No Entry
                </button>
              </div>
            )}
            {step === "qr" && <QRScanner onScan={handleQRScan} />}
            {step === "manual" && (
              <ManualRollInput onSubmit={handleManualSubmit} />
            )}
            {step === "face" && (
              <FaceScan
                rollNo={rollNo}
                onResult={handleFaceScanResult}
                autoScan={autoScan}
              />
            )}
            {step === "result" && (
              <AttendanceResult
                result={result}
                onStartOver={handleStartOver}
                onRescanFace={handleRescanFace}
                onRescanQR={handleRescanQR}
                onReenterRoll={handleReenterRoll}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
