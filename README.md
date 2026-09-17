# National Civic Grievance Redressal Portal — UI

A Next.js (Pages Router, plain `.jsx`, no TypeScript) implementation of the
citizen filing flow and officer console screens, matching the reference
design system (colors, typography, spacing, component styles) pixel-faithfully
in structure.

## Run it

```bash
npm install
npm run dev
```

Then open:
- `http://localhost:3000/` — Citizen Filing Flow (Step 1 of 4)
- `http://localhost:3000/officer` — Officer Console / Grievance Detail

## Structure

```
components/       Shared UI: header bars, nav, badges, cards, sidebar, stepper
pages/index.jsx    Citizen complaint form + Citizens' Charter sidebar
pages/officer/     Officer grievance detail + manual override panel
styles/            Design tokens (globals.css) + per-page CSS Modules
```

## Design tokens

All colors, radii and fonts are defined once in `styles/globals.css` as CSS
custom properties (`--navy-900`, `--amber-500`, `--red-600`, etc.) and
consumed by every component's CSS Module — change a token there to re-theme
the whole app.

## Next steps (not yet wired up)

- Replace the static form/dropdown values with real state + a `/api/`
  route that calls an LLM for classification and acknowledgement text.
- Wire the "Proceed to Review" and "Save Override" buttons to real handlers.
- Add the Acknowledgement and Track-Status screens (steps 3–4 of the stepper).
