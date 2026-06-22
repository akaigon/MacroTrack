// =============================================================================
// db.ts — The app's local database.
//
// We use "Dexie", a small library that makes the browser's built-in database
// (IndexedDB) easy to use. Everything you log lives ON YOUR DEVICE, in your
// browser. There is no server and no account. That's the "local-first" design.
//
// This file does two things:
//   1) Describes the SHAPE of our data (the TypeScript "types" / interfaces).
//   2) Declares the database TABLES and which fields we can search/sort by.
// =============================================================================

import Dexie, { type Table } from "dexie";

// -----------------------------------------------------------------------------
// SHARED TYPES
// -----------------------------------------------------------------------------

// A bundle of the four numbers we track everywhere. "Macros" = macronutrients.
export interface Macros {
  calories: number; // kcal
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
}

export type Units = "metric" | "imperial";
export type Sex = "male" | "female";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type Goal = "lose" | "maintain" | "gain";

// "How we decide your protein/fat target." Either a fixed grams-per-kg rule
// (the default, like MacroFactor) or an absolute number of grams.
export interface MacroRule {
  mode: "perKg" | "absolute";
  value: number; // grams per kg of bodyweight, OR absolute grams
}

// -----------------------------------------------------------------------------
// TABLE TYPES
// -----------------------------------------------------------------------------

// settings — a single row (id = 1) holding everything about you and your plan.
export interface Settings {
  id: number; // always 1 — we only ever keep one settings row
  onboarded: boolean; // have we finished the first-run form yet?
  units: Units;
  sex: Sex;
  age: number; // years
  heightCm: number;
  bodyFatPct?: number; // optional; enables a more accurate BMR formula later
  activityLevel: ActivityLevel;
  goal: Goal;
  ratePerWeek: number; // desired weight change per week, in kg (0 for maintain)
  proteinRule: MacroRule;
  fatRule: MacroRule;
  currentTargets: Macros; // the calorie + macro goals shown on the Today page
  theme?: "system" | "light" | "dark";
}

// foods — anything you can log. Could be a custom food, an Open Food Facts
// product, or a USDA item. Macros are stored PER ONE serving.
export interface Food {
  id?: number; // auto-assigned by the database
  name: string;
  brand?: string;
  source: "custom" | "off" | "usda" | "recipe";
  barcode?: string;
  servingSize: number; // e.g. 100
  servingUnit: string; // e.g. "g", "ml", "piece"
  perServing: Macros;
  favorite?: boolean; // pinned to the favorites list for quick re-logging
  createdAt: number; // timestamp, used for "recent" ordering
}

// recipes — several foods combined, divided into a number of servings.
export interface RecipeItem {
  foodId: number;
  servings: number;
}
export interface Recipe {
  id?: number;
  name: string;
  items: RecipeItem[];
  servingsMade: number; // how many servings the whole recipe yields
  perServing: Macros; // computed: total macros / servingsMade
  createdAt: number;
}

// logEntries — one line in a day's food log. We always store the COMPUTED
// macros so the log stays correct even if the source food is later edited.
export interface LogEntry {
  id?: number;
  date: string; // "YYYY-MM-DD" — the day this was eaten
  name: string; // shown in the timeline
  servingLabel?: string; // optional, e.g. "1 cup" or "200 g" — display only
  foodId?: number; // link back to a food, if it came from one
  servings: number;
  computed: Macros; // macros actually counted for this entry
  createdAt: number; // timestamp, used to order entries within a day
}

// weighIns — your raw body weight, one entry per day.
export interface WeighIn {
  date: string; // "YYYY-MM-DD" (also the primary key — one per day)
  weightKg: number;
}

// weightTrend — the smoothed weight line (derived from weighIns).
export interface WeightTrendPoint {
  date: string; // "YYYY-MM-DD" (primary key)
  smoothedWeightKg: number;
}

// expenditureEstimates — our learned estimate of your real daily burn (TDEE).
export interface ExpenditureEstimate {
  date: string; // "YYYY-MM-DD" (primary key)
  estimatedTdee: number;
  state: "holding" | "updating"; // "holding" = not enough data yet to adapt
}

// checkIns — the weekly review: what we estimated and what targets you accepted.
export interface CheckIn {
  id?: number;
  date: string; // "YYYY-MM-DD"
  estimatedTdee: number;
  proposedTargets: Macros;
  acceptedTargets: Macros;
}

// -----------------------------------------------------------------------------
// THE DATABASE
// -----------------------------------------------------------------------------

export class MacroTrackDB extends Dexie {
  // Each line below tells TypeScript what a table holds.
  settings!: Table<Settings, number>;
  foods!: Table<Food, number>;
  recipes!: Table<Recipe, number>;
  logEntries!: Table<LogEntry, number>;
  weighIns!: Table<WeighIn, string>;
  weightTrend!: Table<WeightTrendPoint, string>;
  expenditureEstimates!: Table<ExpenditureEstimate, string>;
  checkIns!: Table<CheckIn, number>;

  constructor() {
    super("MacroTrackDB"); // the database name in the browser

    // version(1) defines the schema. The strings list the columns we can look
    // up or sort by. "++id" = auto-incrementing primary key. "&date" = the
    // date is the primary key and must be unique. A plain name (no symbol) is
    // an extra index we can query by.
    this.version(1).stores({
      settings: "id",
      foods: "++id, name, barcode, source, favorite, createdAt",
      recipes: "++id, name, createdAt",
      logEntries: "++id, date, foodId, createdAt",
      weighIns: "&date",
      weightTrend: "&date",
      expenditureEstimates: "&date",
      checkIns: "++id, date",
    });
  }
}

// One shared instance the whole app imports.
export const db = new MacroTrackDB();

// Convenience: the settings row always uses id 1.
export const SETTINGS_ID = 1;
