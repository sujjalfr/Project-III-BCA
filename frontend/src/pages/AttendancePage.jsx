import React, { useState, useEffect } from "react";
import ChooseMethod from "../components/common/ChooseMethod";
import QRScanner from "../components/QR/QRScanner";
import ManualRollInput from "../components/common/ManualRollInput";
import FaceScan from "../components/FaceScan/FaceScan";
import AttendanceResult from "../components/Attendance/AttendanceResult";
import { formatNPTOrDash, formatTimeForDisplay } from "../utils/helpers";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const AttendancePage = () => {
  const [step, setStep] = useState("choose");
  const [rollNo, setRollNo] = useState("");
  const [result, setResult] = useState(null);
  const [autoScan, setAutoScan] = useState(true);
  const [lastAttendance, setLastAttendance] = useState(null);

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
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
