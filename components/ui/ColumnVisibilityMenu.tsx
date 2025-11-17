"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  allColumns: { id: string; label: string; toggle: () => void; visible: boolean }[];
}

export default function ColumnVisibilityMenu({ allColumns }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Load saved column visibility  
  useEffect(() => {
    const saved = localStorage.getItem("admin-column-visibility");
    if (!saved) return;

    const parsed = JSON.parse(saved) as Record<string, boolean>;
    allColumns.forEach((col) => {
      if (parsed[col.id] === false && col.visible) col.toggle();
      if (parsed[col.id] === true && !col.visible) col.toggle();
    });
  }, []);

  const save = () => {
    const json: Record<string, boolean> = {};
    allColumns.forEach((col) => (json[col.id] = col.visible));
    localStorage.setItem("admin-column-visibility", JSON.stringify(json));
  };

  // Close when clicking outside  
  useEffect(() => {
    function handle(e: any) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border px-3 py-1 rounded bg-gray-100 dark:bg-gray-800 dark:border-gray-700"
      >
        Columns
        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-900 shadow-lg border dark:border-gray-700 rounded p-3 z-50">

          <p className="text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
            Toggle columns
          </p>

          <div className="space-y-1 max-h-64 overflow-y-auto pr-2">
            {allColumns.map((col) => (
              <label
                key={col.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => {
                    col.toggle();
                    save();
                  }}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {col.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
