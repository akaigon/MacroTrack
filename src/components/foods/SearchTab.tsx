// =============================================================================
// SearchTab.tsx — search the food databases, scan a barcode, and quick-log
// recents & favorites.
//
// While the search box is empty we show your Recents (re-log in one tap) and
// Favorites. Typing runs a debounced search against /api/search. The camera
// button opens the barcode scanner and looks the code up in Open Food Facts.
// =============================================================================
"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import {
  searchFoods,
  lookupBarcode,
  getRecents,
  resultToLoggable,
  foodToLoggable,
  type FoodSearchResult,
  type Loggable,
} from "@/lib/foodSearch";
import FoodRow from "./FoodRow";
import BarcodeScanner from "@/components/BarcodeScanner";

const inputClass =
  "w-full rounded-xl border border-black/10 dark:border-white/15 bg-card px-3 py-2.5 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent";

export default function SearchTab({
  onPick,
}: {
  onPick: (item: Loggable) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Recents (from the log) and favorites (saved foods) update live.
  const recents = useLiveQuery(() => getRecents(8), [], [] as Loggable[]);
  const favorites = useLiveQuery(
    async () => (await db.foods.toArray()).filter((f) => f.favorite),
    []
  );

  // Debounced search: wait ~350ms after the last keystroke before querying.
  // All state updates happen inside the timer (never synchronously in the
  // effect body) so we don't trigger cascading re-renders.
  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setResults([]);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const r = await searchFoods(q);
        setResults(r);
        setError(r.length === 0 ? "No matches found." : null);
      } catch {
        setError("Search failed — check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  async function handleScan(code: string) {
    setScanning(false);
    setLoading(true);
    try {
      const product = await lookupBarcode(code);
      if (product) {
        onPick(resultToLoggable(product));
      } else {
        setError(`No product found for barcode ${code}.`);
      }
    } catch {
      setError("Barcode lookup failed.");
    } finally {
      setLoading(false);
    }
  }

  const searching = query.trim().length >= 2;

  return (
    <div className="space-y-4">
      {/* Search box + camera button */}
      <div className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Search foods…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={() => setScanning(true)}
          aria-label="Scan barcode"
          className="shrink-0 rounded-xl border border-black/10 dark:border-white/15 bg-card px-3"
          title="Scan barcode"
        >
          {/* simple barcode icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 6v12M8 6v12M12 6v12M16 6v12M20 6v12" />
          </svg>
        </button>
      </div>

      {loading && <p className="text-sm text-muted">Searching…</p>}
      {error && !loading && <p className="text-sm text-muted">{error}</p>}

      {/* Search results */}
      {searching && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r, i) => (
            <FoodRow
              key={`${r.source}-${r.barcode ?? i}-${i}`}
              title={r.name}
              subtitle={[
                r.brand,
                `per ${r.servingSize} ${r.servingUnit}`,
                r.source === "off" ? "Open Food Facts" : "USDA",
              ]
                .filter(Boolean)
                .join(" · ")}
              calories={r.perServing.calories}
              onClick={() => onPick(resultToLoggable(r))}
            />
          ))}
        </ul>
      )}

      {/* Landing content when not searching: favorites + recents */}
      {!searching && (
        <>
          {favorites && favorites.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-muted">
                Favorites
              </h3>
              <ul className="space-y-2">
                {favorites.map((f) => (
                  <FoodRow
                    key={`fav-${f.id}`}
                    title={f.name}
                    subtitle={[f.brand, `per ${f.servingSize} ${f.servingUnit}`]
                      .filter(Boolean)
                      .join(" · ")}
                    calories={f.perServing.calories}
                    onClick={() => onPick(foodToLoggable(f))}
                  />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold text-muted">Recent</h3>
            {recents && recents.length > 0 ? (
              <ul className="space-y-2">
                {recents.map((r, i) => (
                  <FoodRow
                    key={`recent-${i}`}
                    title={r.name}
                    subtitle={r.servingLabel}
                    calories={r.perServing.calories}
                    onClick={() => onPick(r)}
                  />
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-6 text-center text-sm text-muted">
                Foods you log will show up here for quick re-logging.
              </p>
            )}
          </section>
        </>
      )}

      {scanning && (
        <BarcodeScanner
          onDetected={handleScan}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}
