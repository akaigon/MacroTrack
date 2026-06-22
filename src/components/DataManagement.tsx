// =============================================================================
// DataManagement.tsx — Export / Import all data as JSON (in Settings).
// Export downloads a backup file; Import replaces all data from one (after a
// confirmation, since it overwrites everything on this device).
// =============================================================================
"use client";

import { useRef, useState } from "react";
import { downloadBackup, importAllData } from "@/lib/backup";

export default function DataManagement() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleExport() {
    setErr(null);
    setMsg(null);
    try {
      await downloadBackup();
      setMsg("Backup downloaded.");
    } catch {
      setErr("Couldn't export your data.");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setMsg(null);
    if (
      !window.confirm(
        "Importing will REPLACE all data currently on this device. Continue?"
      )
    ) {
      e.target.value = "";
      return;
    }
    try {
      const json = JSON.parse(await file.text());
      await importAllData(json);
      setMsg("Data imported successfully.");
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Import failed.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold">Your data</h2>
      <p className="mb-3 text-xs text-muted">
        Everything is stored only on this device. Export regularly to keep a
        backup you can restore or move later.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 font-semibold text-white"
        >
          Export JSON
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex-1 rounded-xl border border-black/10 dark:border-white/15 px-4 py-2.5 font-medium"
        >
          Import JSON
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImport}
          className="hidden"
        />
      </div>
      {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
      {err && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{err}</p>
      )}
    </div>
  );
}
