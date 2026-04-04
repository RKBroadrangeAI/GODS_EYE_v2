"use client";

import { useState, useEffect, useCallback } from "react";
import { Download, Clock, Calendar, CheckCircle2, Loader2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type BackupEntry = {
  id: string;
  year: number;
  month: number;
  frequency: string;
  lastRun: string | null;
  nextRun: string | null;
  createdAt: string;
};

export default function ExportPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Backup schedule state
  const [scheduleFreq, setScheduleFreq] = useState("daily");
  const [scheduleMonth, setScheduleMonth] = useState(currentMonth);
  const [scheduleYear, setScheduleYear] = useState(currentYear);
  const [schedules, setSchedules] = useState<BackupEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/backup/schedules");
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules ?? []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  async function handleDownload() {
    setDownloading(true);
    setDownloadSuccess(false);
    try {
      const res = await fetch(`/api/export?year=${year}&month=${month}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Gods_Eye_${year}_${MONTHS[month - 1]}_Export.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Export failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleAddSchedule() {
    setSaving(true);
    try {
      const res = await fetch("/api/backup/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: scheduleYear,
          month: scheduleMonth,
          frequency: scheduleFreq,
        }),
      });
      if (res.ok) {
        await loadSchedules();
      }
    } catch {
      alert("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSchedule(id: string) {
    try {
      await fetch(`/api/backup/schedules?id=${id}`, { method: "DELETE" });
      await loadSchedules();
    } catch {
      // ignore
    }
  }

  async function handleRunNow(entry: BackupEntry) {
    setDownloading(true);
    try {
      const res = await fetch(`/api/export?year=${entry.year}&month=${entry.month}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Gods_Eye_${entry.year}_${MONTHS[entry.month - 1]}_Backup.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      // Update last_run
      await fetch("/api/backup/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: entry.id }),
      });
      await loadSchedules();
    } catch {
      alert("Backup export failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Export &amp; Backup</h1>

      {/* --------- Manual Export --------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Download className="h-4 w-4" />
            Export to Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-600">
            Download a multi-sheet Excel workbook matching the God&apos;s Eye format. Includes Budget vs Actuals,
            Overall Sales, Sales Performance, In Person vs Remote, Lead Performance, Inventory Tiers, Brand
            Performance, Inventory Mix, and Data Log.
          </p>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Month (for monthly tabs)</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleDownload} disabled={downloading} className="gap-2">
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : downloadSuccess ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? "Generating…" : downloadSuccess ? "Downloaded!" : "Download Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* --------- Backup Schedule --------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Backup Schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-600">
            Configure scheduled backup exports. Each schedule tracks the last export time. Use the &quot;Run Now&quot;
            button to manually trigger a backup download at any time.
          </p>

          {/* Add new schedule */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Frequency</label>
              <select
                value={scheduleFreq}
                onChange={(e) => setScheduleFreq(e.target.value)}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Year</label>
              <select
                value={scheduleYear}
                onChange={(e) => setScheduleYear(Number(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                {[2025, 2026, 2027].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Month</label>
              <select
                value={scheduleMonth}
                onChange={(e) => setScheduleMonth(Number(e.target.value))}
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx + 1}>{m}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleAddSchedule} disabled={saving} variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {saving ? "Saving…" : "Add Schedule"}
            </Button>
          </div>

          {/* Scheduled list */}
          {schedules.length === 0 ? (
            <p className="text-sm text-zinc-400">No backup schedules configured yet.</p>
          ) : (
            <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {schedules.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      {entry.frequency.charAt(0).toUpperCase() + entry.frequency.slice(1)} — {MONTHS[entry.month - 1]} {entry.year}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Last run: {entry.lastRun ? new Date(entry.lastRun).toLocaleString() : "Never"}
                      {entry.nextRun ? ` · Next: ${new Date(entry.nextRun).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleRunNow(entry)}
                      disabled={downloading}
                      className="gap-1 px-3 py-1 text-sm"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Run Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeleteSchedule(entry.id)}
                      className="gap-1 px-3 py-1 text-sm text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
