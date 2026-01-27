import React, { useRef, useState, useEffect } from "react";
import Webcam from "react-webcam";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

const FaceScan = ({ rollNo, onResult, autoScan = false }) => {
  const webcamRef = useRef(null);
  const processingRef = useRef(false);
  const mountedRef = useRef(true);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (autoScan && rollNo) {
      setIsCapturing(true);
    }
  }, [autoScan, rollNo]);

  useEffect(() => {
    if (!isCapturing) return;
    const intervalId = setInterval(async () => {
      if (!mountedRef.current) return;
      if (processingRef.current) return;
      if (!webcamRef.current) return;
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) return;
      processingRef.current = true;
      setLoading(true);
      try {
        const blob = await (await fetch(imageSrc)).blob();
        if (!rollNo) {
          console.error("FaceScan: missing rollNo, skipping POST");
          processingRef.current = false;
          setLoading(false);
          return;
        }
        const formData = new FormData();
        formData.append("roll_no", rollNo);
        formData.append("image", blob, "face.jpg");

        const resp = await axios.post(
          `${API_BASE}/api/attendance/`,
          formData,
          {
            headers: { Accept: "application/json" },
            validateStatus: () => true, // handle non-2xx manually
          },
        );

        const data = resp.data;
        if (resp.status < 200 || resp.status >= 300) {
          console.error("Attendance API error", resp.status, data);
        }

        if (resp.status >= 200 && resp.status < 300) {
          if (data?.message && data.message.startsWith("Attendance marked")) {
            if (!mountedRef.current) return;
            setIsCapturing(false);
            onResult({
              success: true,
              name: data.name || data.message.split("for ")[1] || "",
              rollNo: data.roll_no || rollNo,
              class: data.class || null,
              batch: data.batch || null,
              department: data.department || null,
              time: data.time || null,
            });
            return;
          }
          if (
            data?.message &&
            data.message.startsWith("Attendance already marked")
          ) {
            if (!mountedRef.current) return;
            setIsCapturing(false);
            onResult({
              success: false,
              error: data.message,
              name: data.name || "",
              rollNo: data.roll_no || rollNo,
              class: data.class || null,
              batch: data.batch || null,
              department: data.department || null,
              time: data.time || null,
            });
            return;
          }
          if (data?.error === "No face detected in image") {
            // transient - keep scanning
            processingRef.current = false;
            setLoading(false);
            return;
          }
          if (!autoScan) {
            setIsCapturing(false);
            onResult({
              success: false,
              error: data?.error || data?.message || "Unknown response",
            });
          } else {
            console.warn("FaceScan (auto): unexpected 2xx payload", data);
            processingRef.current = false;
            setLoading(false);
          }
        } else {
          // non-2xx
          const errMsg =
            data?.error ||
            data?.message ||
            resp.statusText ||
            `HTTP ${resp.status}`;
          if (errMsg === "No face detected in image") {
            // transient - keep scanning
            processingRef.current = false;
            setLoading(false);
            return;
          }
          if (!autoScan) {
            setIsCapturing(false);
            onResult({ success: false, error: errMsg });
          } else {
            console.warn(
              "FaceScan (auto): non-2xx response",
              resp.status,
              errMsg,
            );
            processingRef.current = false;
            setLoading(false);
          }
        }
      } catch (err) {
        if (!autoScan) {
          setIsCapturing(false);
          onResult({ success: false, error: "Network error: " + err.message });
        } else {
          console.warn("FaceScan (auto) network error:", err);
          processingRef.current = false;
          setLoading(false);
        }
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isCapturing, rollNo, onResult, autoScan]);

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-4 text-lg font-semibold">
        Scan Face for Roll No: <span className="font-mono">{rollNo}</span>
      </h2>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={320}
        height={240}
        videoConstraints={{ facingMode: "user" }}
        style={{ width: "100%", transform: "scaleX(-1)" }}
        className="rounded-lg shadow mb-4"
      />
      {!isCapturing && !autoScan && (
        <button
          className="btn btn-primary mb-4"
          onClick={() => setIsCapturing(true)}
        >
          Start Face Scan
        </button>
      )}
      {loading && <p className="text-blue-500">Scanning face...</p>}
    </div>
  );
};

export default FaceScan;
