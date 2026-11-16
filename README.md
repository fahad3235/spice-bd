# Spice BD — মসলার ভান্ডার

An offline, bilingual (English / বাংলা) guide to Bangladeshi kitchen spices — know your masala, cook with confidence. Search 24 everyday spices, build classic masala blends by weight, keep a spice-box checklist with a shopping list, and test yourself with a quiz.

- **Live site:** https://fahad3235.github.io/spice-bd/
- **Repo:** https://github.com/fahad3235/spice-bd

## Features

1. **Spice encyclopedia (24 spices)** — Bengali name, English name, transliteration, flavour, heat level (0–3), form (seed / ground / whole / leaf / fresh / blend), best dishes, substitute, kitchen tip and shelf life. Search across Bengali, English and transliterated names; filter by form; favourites-only view.
2. **Spice detail view** — full profile for each spice, plus a personal note saved per spice (localStorage).
3. **Blend builder (4 presets)** — Garam Masala, Panch Phoron, Biryani Masala and Bhaja Masala. Enter a total weight (10–5000 g) and get exact grams per ingredient; the blend bar visualises the proportions. One-tap copy of the recipe.
4. **My Spice Box** — tick the spices you already own; the missing ones become a shopping list you can copy.
5. **Guess-the-spice quiz** — 10 questions, 4 options each, instant feedback, best score saved.
6. **Bilingual UI** — EN/বাংলা toggle persisted across visits, with Bengali digits in Bangla mode.
7. **My Data** — JSON export / strict import of favourites, spice box, notes and best score; typed-DELETE erase-all.

## Stack

- Plain HTML + CSS + vanilla JavaScript — no build step, no dependencies, no network requests.
- Data lives in `js/data.js`; pure logic (search, blend math, quiz, backup validation) in `js/core.js`, shared by the app and the Node tests.
- State is stored only in the browser's `localStorage` — no account, no server.

## Run locally

```bash
# any static server works, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly in a browser.

## Testing

```bash
node tests/test.js        # 18 unit/integration checks (data, search, blend math, quiz, backup, digits)
```

Headless-Chrome smoke tests (desktop 1280px + mobile 390px) exercise the real page in a browser: render, search, favourites, blend scaling, spice box, quiz flow, language toggle and horizontal-overflow checks. The smoke harness lives in `/tmp/spice-smoke.mjs` (it drives the Playwright-cached `headless_shell` binary via CDP) and is not shipped in the repo.

Results at build time (2026-11-16): **18/18 Node checks pass; 19/19 smoke assertions pass at 1280px and 19/19 at 390px; 0 console/page errors; 0 external requests.**

## Limitations

- Content is common culinary knowledge (flavours, typical dishes, substitutes) — a learning guide, not a cookbook or a medical reference. No prices are shown; spice prices change and are not tracked here.
- Fresh spices (green chilli, ginger, garlic) have no shelf-life figure — the app says "use fresh".
- Blend ratios are standard home-cook proportions; adjust to taste.
- All data is stored locally in the browser; clearing site data erases favourites, notes, scores and the spice box unless exported first.

## Status

Complete MVP — published and verified live (GitHub Pages, HTTP 200).
