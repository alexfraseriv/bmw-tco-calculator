# Car cost compare — 3-year TCO calculator

Mobile-first, single-page React app that compares the 3-year total cost of
ownership of any set of vehicles side by side. Mix leases, loans, and
"keep my current car" — the math accounts for each.

The default catalog is the brief that seeded the app (BMW 4 Series lease vs
IONIQ 6 / EV6 / a current 2017 X1) but every input is editable in the UI,
and an **+ Add vehicle** button lets you compare anything else.

All math runs client-side. State serializes into URL params, so any link is a
fully customized scenario the recipient can open and edit.

Live: https://alexfraseriv.github.io/car-cost-compare/

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

The Vite build is configured with `base: '/car-cost-compare/'` so asset URLs
resolve correctly under the project-pages subpath. If you fork this and rename
the repo, update that string in `vite.config.ts`.

### Alternative: Vercel

Static SPA, so `vercel` from this folder also works (drop the `base` override
or move to a custom domain). GitHub Pages is the default target.

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

That's it — table, chart, and per-card delta pick it up automatically. Users
can also add an ad-hoc vehicle in the UI via the **+ Add vehicle** button;
their changes are captured in the URL.

## Known data caveats

The default catalog reflects a specific 2026 Portland-OR negotiation context
(see `BRIEF.md`). Treat numbers as illustrative starting points — every field
is editable and the share-link captures your overrides.

## License

MIT.
