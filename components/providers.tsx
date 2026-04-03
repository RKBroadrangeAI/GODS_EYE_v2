"use client";

import { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: number; message: string; type: "success" | "error" };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      success(message: string) {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type: "success" }]);
        setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 2500);
      },
      error(message: string) {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type: "error" }]);
        setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 3000);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md px-4 py-3 text-sm text-white shadow-lg ${
              toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within Providers");
  }
  return context;
}
