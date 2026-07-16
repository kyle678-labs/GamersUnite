"use client";

import { useEffect, useState } from "react";

// The layout's inline script applies the class before paint; this button just
// flips it and remembers the choice.
export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("gu-theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-110 hover:bg-purple-100 dark:hover:bg-white/10"
    >
      {dark === null ? "🌗" : dark ? "🌞" : "🌙"}
    </button>
  );
}
