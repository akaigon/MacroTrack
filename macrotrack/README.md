# MacroTrack

A private, single-user, local-first calorie & macro tracker, modeled on
MacroFactor. It tracks food intake and body weight, then **learns your real
calorie expenditure from your own data** and adapts your targets over time.

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Data:** stored on your device via IndexedDB (using Dexie) — no server, no
  account, works offline
- **Charts:** Recharts · **Barcode:** @zxing/browser · **PWA:** installable to
  your home screen and works offline

---

## 1) Run it locally

You need [Node.js](https://nodejs.org) (version 18 or newer) installed.

```bash
npm install      # first time only — downloads dependencies
npm run dev      # start the development server
```

Then open **http://localhost:3000** in your browser. On first run you'll see a
short onboarding form; after that you land on the Today dashboard.

To run the optimized production build locally:

```bash
npm run build
npm start
```

### Optional: USDA food database

Food search works out of the box via **Open Food Facts** (no key needed).
To also search **USDA FoodData Central**, get a free key
(https://fdc.nal.usda.gov/api-key-signup.html) and add it:

```bash
cp .env.example .env.local
# then edit .env.local and set FDC_API_KEY=your_key_here
```

The key is read on the server only, so it never reaches the browser.

---

## 2) Install it to your phone home screen

The app is a PWA, so you can install it like a native app. It must be served
over **https** (Vercel does this automatically — see below) or used on
`localhost`.

- **iPhone/iPad (Safari):** open the site → tap the **Share** button → **Add to
  Home Screen**.
- **Android (Chrome):** open the site → tap the **⋮** menu → **Install app**
  (or **Add to Home Screen**).

It then opens full-screen, has its own icon, and works offline (your data lives
on the device).

---

## 3) Deploy free to Vercel

1. Put this project on **GitHub** (create a repo and push it).
2. Go to **https://vercel.com** and sign up / log in (the free "Hobby" plan is
   plenty).
3. Click **Add New… → Project**, then **Import** your GitHub repo.
4. Vercel auto-detects Next.js — just click **Deploy**. No settings to change.
5. (Optional) To enable USDA search in production: in the Vercel project go to
   **Settings → Environment Variables**, add `FDC_API_KEY` with your key, and
   redeploy.
6. You'll get a public URL like `https://macrotrack-xxxx.vercel.app`. Open it on
   your phone and follow the install steps above.

Every time you push to GitHub, Vercel redeploys automatically.

> **Back up your data:** because everything is stored on-device, use
> **Settings → Export JSON** now and then to save a backup. **Import JSON**
> restores it (or moves it to another device/browser).

---

## Project structure

```
src/
  app/                # one folder per page (Next.js App Router)
    page.tsx          # Today (home): targets, ring, food log, check-in banner
    foods/            # Foods tab: search, barcode, custom foods, recipes
    weight/           # Weight tab: weigh-ins + smoothed trend chart
    trends/           # Trends tab: intake, weight, expenditure, averages
    settings/         # Settings: profile, theme, data export/import
    checkin/          # Weekly check-in (adaptive targets)
    onboarding/       # First-run profile form
    api/              # Server routes for food search + barcode lookup
    manifest.ts       # PWA manifest
    layout.tsx        # shared shell (nav, theme, service worker)
    globals.css       # theme colors and base styles
  components/          # reusable UI (charts, forms, nav, log sheet, ...)
  lib/
    db.ts             # the local database (Dexie) and all data types
    nutrition.ts      # BMR/TDEE, targets, macro split, guardrails
    expenditure.ts    # adaptive expenditure estimate + weekly check-in logic
    weight.ts         # weigh-ins + EWMA trend smoothing
    analytics.ts      # aggregations for the Trends charts
    backup.ts         # JSON export / import
    foodSearch.ts     # search/log/save foods, recents
    units.ts          # metric/imperial conversions
    settings.ts       # profile defaults + save
    dateUtils.ts      # date string helpers
public/
  sw.js               # service worker (offline support)
  icon-*.png          # app icons
```

## How the adaptive targets work (the key feature)

Over a trailing 14-day window the app compares your **average intake** with the
change in your **smoothed trend weight** (converted to calories at ~7700 kcal/kg)
to back-calculate your real expenditure (TDEE). It blends that with the previous
estimate (`new = prior + 0.25 × (observed − prior)`) for stability, and stays in
a **"holding"** state until there's enough clean data. Each week, the check-in
proposes updated targets from the learned TDEE and your goal — which you accept,
tweak, or skip. Safety guardrails cap aggressive loss rates and never push
calories below your estimated resting needs.
