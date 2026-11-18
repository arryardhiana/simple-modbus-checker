import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem("theme-mode") === "dark" ||
      (!("theme-mode" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme-mode", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme-mode", "light");
    }
  }, [isDark]);

  return (
    <Button
      variant="outline"
      size="icon"
      className="h-8 w-8 rounded-md"
      onClick={() => setIsDark((prev) => !prev)}
      title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-all text-amber-500" />
      ) : (
        <Moon className="h-4 w-4 transition-all text-slate-700" />
      )}
    </Button>
  );
}
