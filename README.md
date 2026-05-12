# BMW 430i vs EV — 3-Year TCO Calculator

Mobile-first, single-page React app that compares the 3-year total cost of
ownership of a 2026 BMW 430i lease against EV alternatives (Hyundai IONIQ 6,
Polestar 3 by default — easy to add more).

All math runs client-side. State serializes into URL params, so any link is a
fully customized scenario the recipient can open and edit.

Live (after first deploy): https://alexfraseriv.github.io/bmw-tco-calculator/

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS (custom dark palette)
- Recharts for the cumulative-cost line chart
- No backend, no analytics, no router — `history.replaceState` keeps the URL in sync

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle to dist/
npm run preview  # serve the production build locally
```

## Deploy to GitHub Pages

The repo includes `.github/workflows/deploy.yml` which builds and publishes
`dist/` to GitHub Pages on every push to `main`.

First-time setup:

```bash
# from inside this folder, after `git init && git add . && git commit`
gh repo create alexfraseriv/bmw-tco-calculator --public --source=. --remote=origin --push
```

The workflow needs Pages set to **GitHub Actions** as the source. If the first
run errors with "Pages not enabled", visit:

```
Settings → Pages → Build and deployment → Source: GitHub Actions
```

…and re-run the workflow. After that, every `git push` redeploys automatically.

The Vite build is configured with `base: '/bmw-tco-calculator/'` so asset URLs
resolve correctly under the project-pages subpath.

### Alternative: Vercel

Static SPA, so `vercel` from this folder also works (you'd want to drop the
`base` override or move to a custom domain). GitHub Pages is the default
target.

## Data model

The full state is three concepts: a **`Vehicle[]`** catalog (price, lease,
MPG/MPGe, insurance, maintenance), a **`DrivingProfile`** (round-trip miles,
trips/mo, other miles, lease allowance, overage rate), and three
**`EnergyScenario`** rows for low/average/high gas + electricity prices. The
user picks one active scenario; the chart and totals re-render against it. All
of this is encoded into URL params as compact key=value strings (only
overrides of defaults are emitted) so shared links stay short. Adding a new
vehicle is a one-object append to `src/defaults.ts` — the chart, table, and
cards loop over the array, so no other code changes.

## Calculation

Per the EPA's MPGe definition, **33.7 kWh = 1 gasoline-gallon-equivalent**.

```
monthly_miles = round_trip × trips_per_month + other_monthly_miles
annual_miles  = monthly_miles × 12

# Per vehicle, per scenario:
fuel_gas = (monthly_miles / mpg) × gas_price
fuel_ev  = monthly_miles × (33.7 / mpge) × electricity_rate

overage_annual = max(0, annual_miles − lease_allowance_annual)
overage_monthly = (overage_annual × overage_rate) / 12

monthly_total = lease + fuel + insurance + maintenance/12 + overage_monthly
three_year_total = monthly_total × 36
```

The chart plots cumulative `monthly_total × month` for each vehicle over a
36-month horizon.

## File layout

```
src/
  App.tsx                 # composition + URL state + headline savings
  calc.ts                 # pure math (testable, no React)
  defaults.ts             # vehicle catalog + driving + scenario defaults
  types.ts                # Vehicle / DrivingProfile / EnergyScenario / results
  urlState.ts             # encode/decode AppState ↔ URLSearchParams
  useUrlState.ts          # React hook that round-trips state into history
  index.css               # Tailwind entry + minor chart overrides
  components/
    DrivingPanel.tsx
    NumberInput.tsx
    ScenariosPanel.tsx
    ShareBar.tsx          # navigator.share / clipboard fallback
    TcoChart.tsx          # Recharts line chart, one Line per vehicle
    VehicleCard.tsx       # editable spec card + per-vehicle breakdown
```

## Adding another vehicle

Append one object to `DEFAULT_VEHICLES` in `src/defaults.ts`:

```ts
{
  id: "i4",
  name: "BMW i4 eDrive40",
  shortName: "BMW i4",
  color: "#8b5cf6",
  msrp: 58000,
  monthlyLease: 600,
  efficiency: 109,
  isGas: false,
  monthlyInsurance: 220,
  annualMaintenance: 150,
  fuelType: "electric",
}
```

That's it — table, chart, and per-card delta vs the BMW 430i pick it up
automatically. Users can also add an ad-hoc vehicle in the UI via the **+ Add
vehicle** button; their changes are captured in the URL.

## Known data caveats

- **Polestar 3 MPGe**: spec sheet ranges 78–85 depending on trim/wheels. The
  brief used ~80 combined; this app uses 80. Override per-vehicle if needed.
- **IONIQ 6 MPGe**: the Limited RWD is rated 117 combined; the brief's
  "117 combined (151/120)" line mixed the city/highway from a different trim.
  This app uses 117 and lets the user edit.
- **Insurance and lease**: placeholders. Quote-verify before treating any
  total as gospel.

## License

MIT.
