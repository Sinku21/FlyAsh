# Ash Ledger

Interactive, driver-based financial model for the Phulla–Vedanta fly-ash
valorisation JV (Jharsuguda). Every assumption from
`PhullaVedanta_FlyAsh_Financial_Model_v07.xlsx` is a live input on screen;
the 15-year P&L, cash/loan waterfall, and charts recalculate the instant a
value changes. See [`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for exactly
how the engine maps to the source workbook and where it deliberately departs
from it.

## Stack, and why it's this small

This is a static site: vanilla HTML/CSS/JavaScript, bundled by
[Vite](https://vite.dev), with no UI framework and no backend.

- **No React/Vue/etc.** — the app is one form and two charts; a component
  framework would add a dependency and a build-complexity tax without
  changing what ships to the browser.
- **No charting library** — the two charts are ~100 lines of hand-rolled SVG
  each (`src/charts.js`), which keeps the whole production JS bundle at
  **~18 KB gzipped ~6 KB**.
- **No API, no database** — every number a viewer sees is computed in their
  own browser from the values they typed in. There is nothing to
  authenticate, store, or protect server-side, which is also why there are
  **no environment variables** (see below).

If the app grows a feature that needs a server (saving named scenarios
against a user login, emailing a PDF snapshot, etc.), Vercel Serverless/Edge
Functions under `/api` are the natural next step and need no changes to this
build setup.

## Project structure

```
ash-ledger/
├── index.html                # Vite entry HTML — page shell, no inline JS/CSS
├── package.json
├── vite.config.js            # build output -> dist/
├── vercel.json                # explicit Vercel build/output config
├── .env.example                # documents that no env vars are required today
├── .gitignore
├── public/
│   └── favicon.svg
├── src/
│   ├── main.js                # entry point: imports CSS, boots the app
│   ├── engine.js              # pure calculation engine (no DOM) — the model itself
│   ├── panels.js               # declarative spec for the Input Console's fields
│   ├── charts.js               # hand-rolled SVG bar chart + area chart, with tooltips
│   ├── format.js               # ₹ Crore / percentage formatters
│   ├── ui.js                    # DOM rendering + event wiring, holds app state
│   └── styles.css               # all styling (design tokens, light/dark themes)
├── test/
│   └── engine.test.js          # vitest suite — reconciles the engine against v07
└── docs/
    └── METHODOLOGY.md            # what the engine does vs. the source Excel model
```

`src/engine.js` has no dependency on `document`/`window`, so it can be
unit-tested directly (see `test/engine.test.js`) and reused unchanged if the
UI is ever rebuilt in a framework.

## Local development

Requires Node.js 18+ (works on the Node 22 LTS line too).

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173` with hot module reload —
editing any file under `src/` updates the page without a full reload.

## Testing

```bash
npm run test        # run once
npm run test:watch  # re-run on change
```

`test/engine.test.js` asserts the engine reproduces the reconciled reference
figures in `docs/METHODOLOGY.md` (15-year revenue, PAT, margin, peak funding,
breakeven month) to a tight tolerance, plus a few structural sanity checks
(the loan balance never goes negative, cash and loan are never both
outstanding at once, a Custom-only lever never leaks into other scenarios).
Run this after touching `src/engine.js` — a silent formula regression here is
the one bug in this app that actually matters.

## Building for production

```bash
npm run build      # writes static output to dist/
npm run preview    # serve that dist/ build locally, to sanity-check it
```

`vite build` produces a fully static `dist/` folder (`index.html` plus
hashed, cache-friendly assets under `dist/assets/`) — no server process is
required to run it anywhere, Vercel included.

## Environment variables

**None are required.** There is no `.env` file to create before this will
run or deploy. `.env.example` at the repo root documents this explicitly and
shows the convention to follow (`VITE_`-prefixed for anything the browser
bundle needs, unprefixed for server-only secrets) if you add a backend later.

## Deploying to Vercel

Either method below works from a clean checkout of this repo with no extra
configuration — `vercel.json` already tells Vercel the build command and
output directory, and the Vite framework preset is auto-detected.

### Option A — Vercel CLI (fastest for a one-off or first deploy)

```bash
npm install -g vercel     # skip if you already have it
vercel login
vercel                     # first run: links/creates the project, deploys a Preview
vercel --prod               # promotes to the Production domain
```

The CLI will ask three questions on first run (set up and deploy?, which
scope/team?, link to existing project?) — accept the defaults unless you're
attaching this to a project that already exists on Vercel.

### Option B — Git integration (recommended for ongoing work)

1. Push this repository to GitHub, GitLab, or Bitbucket.
2. In the [Vercel dashboard](https://vercel.com/new), click **Add New →
   Project** and import that repository.
3. Vercel reads `vercel.json` and auto-detects the **Vite** framework preset:
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

   You shouldn't need to change any of these — they're set explicitly in
   `vercel.json` so the values above are what Vercel will show, not guesses.
4. Skip the **Environment Variables** step — there are none to add (see
   above). If you've added your own later, this is where you'd set them, and
   Vercel exposes them to the build the same way a local `.env` file would.
5. Click **Deploy**. Every subsequent push to the connected branch triggers
   a new deployment automatically; pushes to other branches/PRs get their
   own Preview URL.

### Custom domain

Project → **Settings → Domains** → add the domain and follow Vercel's DNS
instructions (a `CNAME` to `cname.vercel-dns.com` for a subdomain, or an `A`
record for an apex domain). No app changes are needed either way, since the
app has no notion of its own hostname.

### Verifying a deployment

Open the deployed URL and check:
- The **Base** scenario shows Revenue **₹19,471.5 Cr** and PAT **₹12,347.6
  Cr** on load (these are the same reconciled figures the test suite checks).
- Switching to **Severe** shows Revenue **₹14,849.6 Cr**.
- Opening dev tools shows no console errors (a broken font `<link>` or a
  missing asset path would show up here first).

If those don't match, the most likely cause is a stale build artifact —
redeploy, or run `npm run build && npm run preview` locally to isolate
whether it's a build issue or a Vercel configuration issue.
