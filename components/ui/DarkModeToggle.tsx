"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Load theme from localStorage OR system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");

    if (saved === "dark" || saved === "light") {
      setTheme(saved as any);
      document.documentElement.classList.toggle("dark", saved === "dark");
    } else {
      const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(systemDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", systemDark);
    }

    setMounted(true);
  }, []);

  if (!mounted) return null; // avoid hydration mismatch

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);

    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 
                 rounded-full border dark:border-gray-700
                 bg-gray-100 dark:bg-gray-800 
                 hover:bg-gray-200 dark:hover:bg-gray-700 
                 transition"
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-yellow-400" />
      ) : (
        <Moon size={18} className="text-gray-800" />
      )}
    </button>
  );
}
