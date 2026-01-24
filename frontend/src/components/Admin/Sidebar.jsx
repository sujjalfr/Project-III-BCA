import React, { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

export default function Sidebar({ open = true, onClose = () => {} }) {
  const ref = useRef(null);
  const [collapsed, setCollapsed] = useState(() => {
    try {
        const v = localStorage.getItem("admin_sidebar_collapsed");
        return v === null ? true : v === "true";
    } catch (e) {
        return true;
    }
  });

  // persist collapsed preference
  useEffect(() => {
    try {
      localStorage.setItem("admin_sidebar_collapsed", collapsed ? "true" : "false");
    } catch (e) {}
  }, [collapsed]);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (!open) return;
      if (!ref.current) return;
      if (ref.current.contains(e.target)) return;

      const isDesktop = window.innerWidth >= 768;
      // On mobile (not desktop) always close when clicking outside.
      // On desktop only close when the sidebar is expanded (not icon-only).
      if (!isDesktop || !collapsed) onClose();
    }

    function handleKey(e) {
      if (e.key !== "Escape") return;
      const isDesktop = window.innerWidth >= 768;
      if (!isDesktop || !collapsed) onClose();
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  // If parent opens the sidebar (mobile), also expand on larger screens
//   useEffect(() => {
//     try {
//       const isDesktop = window.innerWidth >= 768;
//       if (open && isDesktop) setCollapsed(false);
//     } catch (e) {}
//   }, [open]);

  return (
    <aside
      ref={ref}
      onClick={() => {
        if (collapsed) setCollapsed(false);
      }}
      className={`fixed inset-y-0 left-0 bg-gray-800 text-white transform h-screen ${
        open ? "translate-x-0" : "-translate-x-full"
      } md:translate-x-0 ${collapsed ? "w-16" : "w-64"} transition-[width,transform] duration-300 z-40 md:z-auto md:static overflow-hidden`}
      aria-hidden={!open}
    >
      <div className="p-4 flex items-center justify-between">
        {/* <h2 className="text-lg font-semibold">Admin</h2> */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // when expanded, allow closing on the close button
            if (!collapsed) setCollapsed(true);
            onClose();
          }}
          className="md:hidden px-2 py-1 rounded hover:bg-gray-700"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <nav className="mt-4 px-2">
        {[
          { to: "/admin", label: "Overview", icon: "M3 12h18" },
          { to: "/admin/students", label: "Students", icon: "M3 6h18M3 12h18M3 18h18" },
          { to: "/admin/students/add", label: "Add Student", icon: "M12 5v14M5 12h14" },
          { to: "/admin/settings", label: "Settings", icon: "M12 8a4 4 0 100 8 4 4 0 000-8z" },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded ${isActive ? "bg-gray-700" : "hover:bg-gray-700"}`
            }
            title={item.label}
          >
            <span className="w-6 h-6 flex items-center justify-center">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d={item.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={`${collapsed ? "hidden" : "inline"}`}>{item.label}</span>
          </NavLink>
        ))}

        <div className="mt-4 px-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700"
            aria-pressed={!collapsed}
          >
            <span className="w-6 h-6 flex items-center justify-center">{collapsed ? "»" : "«"}</span>
            <span className={`${collapsed ? "hidden" : "inline"}`}>Collapse</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
