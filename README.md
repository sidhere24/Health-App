# HydraPrep — Hormonal & Whole-Food Meal Planner

Mobile-first meal planning for hormonal & whole-food wellness: a daily meal
schedule, macro/micronutrient tracker, weekly matrix & batch-prep checklists,
local-market grocery planner, and whole-food browsing index.

HydraPrep is a PWA — install it on your phone for offline use, or run it in the
browser.

## Quick start

```
npm install
npm run dev
```

Dev server: `http://localhost:3000`.

### Server (AI planner)

HydraPrep's AI meal planner runs as a small Express server (uses the Gemini API):

```
npm run server    # starts on http://localhost:3001
```

When using `npm run dev`, the Vite dev server proxies `/api` to the server.
Needs `GEMINI_API_KEY` in `.env` (see `.env.example`).

## Globalization

HydraPrep is designed global-first:
- **Regional foods** for non-Indian regions (USA, UK) come from Spoonacular —
  generate them via `npm run generate:regional-foods` with a `SPOONACULAR_API_KEY`
  in `.env` (free Spoonacular tier; get a key at spoonacular.com).
  The generated data is committed to `src/data/regionalFoods.ts` and used
  by `getLocalizedFoods()`.
- **Imperial units**: US/UK regions display lb/oz via `formatWeight()`.
- All six regions are configured for currencies, markets, and budget formats.

## Features

- **AI Meal Planner** — "AI Plan" button generates your weekly plan from your
  profile + macro targets via Gemini.
- **Voice Log** — speak what you ate or want to plan ("I ate the oat bowl");
  transcribed on device and parsed by the server to consume/plan.
- **Snap to Log** — take a photo of your plate; the server identifies the foods
  (vision model) and logs the best-matching meal as eaten.
- **Spoonacular recipe search** — "Search Spoonacular recipes" in the Food Index.
- **Delivery & Retail Links** — Amazon Fresh, Instacart, BigBasket, BlinkIt
  links in the grocery list.
- **Regional foods** — USA/UK foods via Spoonacular (`npm run generate:regional-foods`).

## Server

HydraPrep runs as a small Node server (`npm run server`) providing:
- `POST /api/ai/plan` — AI meal planner (Gemini)
- `POST /api/ai/voice` — voice → meal command parsing (Gemini)
- `POST /api/ai/identify` — photo → food identification (Gemini vision)
- `GET /api/spoonacular/search?query=...` — Spoonacular recipe search (free tier, cached)
- `GET /api/regional-foods/:regionId` — regenerated regional foods

Needs `GEMINI_API_KEY` and `SPOONACULAR_API_KEY` in `.env` (see `.env.example`).
When using `npm run dev`, the Vite dev server proxies `/api` to the server.

## Commands

- `npm run dev` — Vite dev server on port 3000 (`--host=0.0.0.0`)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm run clean` — remove `dist/` and stray `server.js`
- `npm run generate:regional-foods` — regenerate USA/UK Spoonacular regional foods
- `npm run lint` — TypeScript check (`tsc --noEmit`)
- `npm test` — unit tests (all `src/utils/*.test.ts` via `node:test`/`tsx`)

## Project layout

- `src/App.tsx` — app shell, state, persistence (`localStorage`)
- `src/components/` — views & modals (Daily Tracker, Weekly Prep, Grocery List,
  Food Index, onboarding/swap/legal modals)
- `src/data/hyderabadMeals.ts` — foods, meal library, default week plan, batch-prep tasks
- `src/data/regions.ts` — region configs (local names, sourcing, prices), age-group & weight-class presets
- `src/types/nutrition.ts` — shared types
- `src/utils/nutrition.ts` — biometric targets, nutrition math, grocery aggregation
- `src/utils/habits.ts` — consistency metrics, grocery-fulfillment partitioning
- `src/utils/links.ts` — affiliate search URLs, custom link sanitizing
- `src/hooks/usePWAInstall.ts` — PWA install & online status hooks

## Notes

- All user data (profile, week plan, checkmarks, custom foods) is stored
  locally via `localStorage`; nothing is uploaded.
- Affiliate links are generated on demand; the app never collects or uploads data.
- Unit tests live next to the code they test and run with the `node:test`
  runner through `tsx`.
