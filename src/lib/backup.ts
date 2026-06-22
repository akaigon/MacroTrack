// =============================================================================
// backup.ts — export ALL your data to a JSON file, and import it back.
//
// Because everything lives only in this browser, these buttons are your safety
// net: export regularly to keep a backup, and import to restore or to move your
// data to a future cloud-synced version of the app.
// =============================================================================

import { db } from "./db";

// A bumpable version so a future importer can migrate old backups if needed.
const BACKUP_VERSION = 1;

export interface BackupFile {
  app: "MacroTrack";
  version: number;
  exportedAt: string;
  data: {
    settings: unknown[];
    foods: unknown[];
    recipes: unknown[];
    logEntries: unknown[];
    weighIns: unknown[];
    weightTrend: unknown[];
    expenditureEstimates: unknown[];
    checkIns: unknown[];
    dayTargets: unknown[];
  };
}

// Gather every table into one plain object.
export async function exportAllData(): Promise<BackupFile> {
  const [
    settings,
    foods,
    recipes,
    logEntries,
    weighIns,
    weightTrend,
    expenditureEstimates,
    checkIns,
    dayTargets,
  ] = await Promise.all([
    db.settings.toArray(),
    db.foods.toArray(),
    db.recipes.toArray(),
    db.logEntries.toArray(),
    db.weighIns.toArray(),
    db.weightTrend.toArray(),
    db.expenditureEstimates.toArray(),
    db.checkIns.toArray(),
    db.dayTargets.toArray(),
  ]);

  return {
    app: "MacroTrack",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings,
      foods,
      recipes,
      logEntries,
      weighIns,
      weightTrend,
      expenditureEstimates,
      checkIns,
      dayTargets,
    },
  };
}

// Trigger a file download of the backup in the browser.
export async function downloadBackup(): Promise<void> {
  const backup = await exportAllData();
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `macrotrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Replace ALL current data with the contents of a backup file. This overwrites
// everything, so the UI confirms first. Throws if the file looks invalid.
export async function importAllData(json: unknown): Promise<void> {
  const file = json as Partial<BackupFile>;
  if (!file || file.app !== "MacroTrack" || !file.data) {
    throw new Error("This doesn't look like a MacroTrack backup file.");
  }
  const d = file.data;

  // Do it all in one transaction so a failure can't leave half-imported data.
  await db.transaction(
    "rw",
    [
      db.settings,
      db.foods,
      db.recipes,
      db.logEntries,
      db.weighIns,
      db.weightTrend,
      db.expenditureEstimates,
      db.checkIns,
      db.dayTargets,
    ],
    async () => {
      await Promise.all([
        db.settings.clear(),
        db.foods.clear(),
        db.recipes.clear(),
        db.logEntries.clear(),
        db.weighIns.clear(),
        db.weightTrend.clear(),
        db.expenditureEstimates.clear(),
        db.checkIns.clear(),
        db.dayTargets.clear(),
      ]);
      await Promise.all([
        db.settings.bulkAdd((d.settings ?? []) as never[]),
        db.foods.bulkAdd((d.foods ?? []) as never[]),
        db.recipes.bulkAdd((d.recipes ?? []) as never[]),
        db.logEntries.bulkAdd((d.logEntries ?? []) as never[]),
        db.weighIns.bulkAdd((d.weighIns ?? []) as never[]),
        db.weightTrend.bulkAdd((d.weightTrend ?? []) as never[]),
        db.expenditureEstimates.bulkAdd((d.expenditureEstimates ?? []) as never[]),
        db.checkIns.bulkAdd((d.checkIns ?? []) as never[]),
        db.dayTargets.bulkAdd((d.dayTargets ?? []) as never[]),
      ]);
    }
  );
}
