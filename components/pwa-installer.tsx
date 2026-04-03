"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type DeferredPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstaller() {
  const [promptEvent, setPromptEvent] = useState<DeferredPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js");
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as DeferredPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
  }

  if (!promptEvent) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
      <p className="mb-2 text-xs text-zinc-600">Install GOD&apos;S EYE for faster mobile access</p>
      <Button onClick={install} className="h-9 gap-2">
        <Download className="h-4 w-4" />
        Install App
      </Button>
    </div>
  );
}
