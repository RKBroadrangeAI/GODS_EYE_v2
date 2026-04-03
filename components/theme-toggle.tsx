"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const [dark, setDark] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("gods-eye-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  function toggle() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("gods-eye-theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <Button variant="outline" onClick={toggle} className="w-full justify-start gap-2">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {dark ? "Light Mode" : "Dark Mode"}
    </Button>
  );
}
