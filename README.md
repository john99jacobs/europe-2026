# Jacobs Family Europe 2026

A mobile-first progressive web app for tracking a 15-day family trip through Norway, the Netherlands, and Poland.

**Live site:** [john99jacobs.github.io/europe-2026](https://john99jacobs.github.io/europe-2026)

---

## Features

- **Today view** — day number, current city, today's events in chronological order, tomorrow's preview, tonight's lodging, and live weather
- **Full itinerary** — all 15 days, scrollable, with tappable map links for every address
- **PWA** — installable on iPhone home screen, full offline support via service worker
- **Unbooked items flagged** — visually distinct so nothing gets missed

## Tech

Plain HTML, CSS, and JavaScript. No framework, no build step. Hosted on GitHub Pages.

- Weather: [Open-Meteo](https://open-meteo.com/) (free, no API key)
- Maps: Apple Maps on iOS, Google Maps everywhere else
- Data: `trip.json` — single source of truth for all trip data

## Install on iPhone

1. Open **Safari** — Chrome and Firefox on iOS cannot install PWAs
2. Go to [john99jacobs.github.io/europe-2026](https://john99jacobs.github.io/europe-2026)
3. Tap the **Share** button (box with arrow, bottom toolbar)
4. Scroll the share sheet and tap **Add to Home Screen**
5. Tap **Add**

The icon appears on your home screen. The app opens full-screen, and the full itinerary is available offline after the first load.

> **After a trip data update:** pull down from the top of the screen to refresh. The spinner appears and the app reloads with the latest data.

## Updating trip data

All trip details live in `trip.json`. When something changes (new booking, time update, gate change):

1. Edit `trip.json` directly — the schema is in [`ARCHITECTURE.md`](../travel/ARCHITECTURE.md)
2. Review the diff
3. Push to `main` — the site updates within ~30 seconds

No HTML, CSS, or JavaScript needs to change for data updates.

## Local development

No build step — just serve the files from the repo root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Use this instead of opening `index.html` directly (the service worker requires HTTP, not `file://`).

## CI

A GitHub Actions workflow validates `trip.json` against `trip.schema.json` on every push.

## Privacy

This is a public repo. `trip.json` contains dates, times, carrier names, seat assignments, and addresses — but **no confirmation numbers, reservation IDs, or booking references**. Sensitive booking data lives only in iCloud.
