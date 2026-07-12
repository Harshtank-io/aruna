# Aruna — Photographer Location Scouting

Map-centric scouting dashboard for photographers: capture a location, pick photography tags, and generate an AI briefing covering light windows, composition cues, gear suggestions, and access notes.

Built with Next.js 16 (App Router), React 19, Tailwind CSS 4, react-hook-form + Zod, and Google Gemini.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to the dashboard.

The app works **without any API key**: briefings fall back to a local simulated preview so the scouting flow is always usable.

## Free API key setup (optional, for live AI briefings)

1. Get a free Gemini API key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — no billing required.
2. Copy `.env.example` to `.env.local` and paste your key:

   ```bash
   GEMINI_API_KEY=your-key-here
   ```

### Stretching the free tier

- **Key pool rotation:** free-tier quota is per key. Provide several free keys comma-separated and Aruna automatically rotates to the next key when one hits its quota (429):

  ```bash
  GEMINI_API_KEY=key1,key2,key3
  ```

- **Model choice:** `gemini-2.5-flash-lite` (default) has the most generous free-tier limits. Override with `GEMINI_MODEL` if needed:

  ```bash
  GEMINI_MODEL=gemini-2.5-flash
  ```

- **Graceful fallback:** if every key is exhausted, Aruna serves the local simulated briefing with a notice — the app never hard-fails on quota.

## Project structure

```
src/
  app/
    dashboard/page.tsx        # Main dashboard (map + scouting drawer)
    actions/generate-briefing.ts  # Server action: Gemini call + key rotation + fallback
  components/
    map-canvas.tsx            # Map placeholder with live scout pin preview
    scouting-drawer.tsx       # Location form + tags + AI briefing output
  lib/schemas/scouting.ts     # Zod form schema
  types/scouting.ts           # Shared types + photography tags
```

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
