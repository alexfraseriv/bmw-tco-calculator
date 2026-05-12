# BMW 430i vs EV Total Cost of Ownership Calculator

**Handoff Document — May 12, 2026**

---

## 1. Project Brief

A friend in Portland, OR is evaluating a 2026 BMW 430i (cash purchase or 3-year lease at ~$550/mo). His job requires driving from Portland to Bellevue, WA twice per month, plus driving around Bellevue while there for two weeks each month. He wants to understand the full total cost of ownership (TCO) and compare against luxury-feel EV alternatives (Hyundai IONIQ 6, Polestar 3).

**Goal:** Build a shareable calculator (sendable via WhatsApp) that lets him plug in his own driving numbers and compare 3-year TCO across multiple vehicles and energy-price scenarios.

---

## 2. Requirements

### Functional

- **Editable inputs** with sensible defaults the user can override
- **Scenario modeling**: low / average / high for gas and electricity prices
- **Side-by-side comparison** of multiple vehicles (not just swap, compare)
- **Line chart visualization** of TCO over time
- **Extensible data structure** — adding a new vehicle should require only adding a column/row of specs, not changing logic
- **Mobile-friendly** — must work well on iPhone (target user views via WhatsApp link)
- **Shareable URL** — can be sent over WhatsApp

### Vehicles (initial set)

1. **BMW 430i** (2026, gas, premium fuel)
2. **Hyundai IONIQ 6 Limited** (EV, sedan, "premium feel" alternative)
3. **Polestar 3** (EV, luxury SUV, premium alternative)

Structure should make it trivial to add: Tesla Model 3, BMW i4, Genesis GV60, Audi Q4 e-tron, etc.

### Cost Components

- Monthly lease payment (or amortized purchase price if buying)
- Fuel cost (gas vehicles) or electricity cost (EVs)
- Insurance
- Maintenance (annualized → monthly)
- **Lease mileage overage** (critical — see Section 5)

---

## 3. User's Driving Profile (Default Assumptions)

| Variable | Default | Notes |
|---|---|---|
| Round trip Portland → Bellevue | 352 miles | I-5 N, ~2h 51m each way |
| Trips per month | 2 | Two weeks/month onsite |
| Other monthly miles | 800 | Errands, weekends, driving while in Bellevue — **needs user verification** |
| Total monthly miles | 1,504 | Calculated |
| Annual miles | 18,048 | Calculated |
| Standard lease allowance | 12,000 mi/yr | Industry default |
| Overage charge | $0.25/mile | Typical BMW Financial Services rate |

⚠️ **Critical finding**: At 18k mi/yr, friend exceeds standard 12k lease allowance by ~6k miles/yr → ~$1,500/yr in overage fees → **$4,500 over a 3-year lease** if not renegotiated. Recommend negotiating 15k mi/yr lease upfront (~$50–80/mo more, much cheaper than overage).

---

## 4. Vehicle Data

| Spec | BMW 430i | Hyundai IONIQ 6 Limited | Polestar 3 |
|---|---|---|---|
| MSRP (Portland, incl. destination) | $57,290 | ~$53,000 | ~$73,000 |
| Monthly lease (36 mo / 12k mi) | $550* | ~$425 | ~$750 |
| MPG / MPGe | 28 combined (25/34) | 117 combined (151/120) | ~80 combined |
| Fuel type | Premium gas | Electric | Electric |
| Monthly insurance estimate (Oregon, BMW-tier driver) | ~$225 | ~$175 | ~$250 |
| Annual maintenance | ~$200 | ~$100 | ~$150 |
| Range / Tank | ~395 mi tank | 342 mi (RWD) / 316 (AWD) | ~300 mi |

\* User-provided quote. Market data suggests typical 430i leases run $650–$870/mo, so verify quote.

### Sources

- BMW 430i MSRP: Edmunds Portland inventory data
- BMW 430i MPG: EPA / KBB
- IONIQ 6: KBB 2026 preview, US News
- Polestar 3: Polestar US pricing (approximate)
- Insurance: Insurify / SmartFinancial averages adjusted for Oregon
- Gas prices: AAA Oregon ($5.33 avg) and Oregon DOT Monthly Fuel Price (May 2026: $4.66)

---

## 5. Energy Price Scenarios

| Scenario | Gas ($/gal) | Electricity ($/kWh) |
|---|---|---|
| Low | $4.00 | $0.13 |
| Average | $5.30 | $0.16 |
| High | $7.00 | $0.20 |

---

## 6. Calculation Logic

```
monthly_miles = (round_trip_miles × trips_per_month) + other_monthly_miles
annual_miles = monthly_miles × 12

# Per-vehicle monthly fuel/electric cost:
if vehicle.is_gas:
    monthly_fuel = (monthly_miles / vehicle.mpg) × gas_price
else:  # EV
    # 33.7 kWh = 1 gallon-equivalent (EPA MPGe definition)
    monthly_fuel = monthly_miles × (33.7 / vehicle.mpge) × electricity_rate

# Per-vehicle monthly mileage overage (if leasing):
annual_overage_miles = max(0, annual_miles - lease_allowance)
monthly_overage_cost = (annual_overage_miles × overage_rate) / 12

# Total monthly cost:
monthly_total = lease + monthly_fuel + insurance + (annual_maintenance / 12) + monthly_overage_cost

# 3-year total:
three_year_total = monthly_total × 36
```

For each vehicle × {Low, Average, High} → compute 3-year total.
Plot 3 lines (one per vehicle), x-axis = month (0-36), y-axis = cumulative cost.

---

## 7. Recommended Stack

- **React** (Vite or single-file HTML with React via CDN — either works)
- **Recharts** for the line chart
- **Tailwind** for styling
- No backend — all state in React, all math client-side
- Target: deployable to Vercel free tier OR a single static HTML file

### Data Model

```typescript
interface Vehicle {
  id: string;
  name: string;
  msrp: number;
  monthlyLease: number;
  efficiency: number;      // MPG or MPGe
  isGas: boolean;
  monthlyInsurance: number;
  annualMaintenance: number;
  fuelType: 'premium' | 'regular' | 'electric';
}

interface DrivingProfile {
  roundTripMiles: number;
  tripsPerMonth: number;
  otherMonthlyMiles: number;
  leaseAllowanceAnnual: number;
  overagePerMile: number;
}

interface EnergyScenario {
  label: 'Low' | 'Average' | 'High';
  gasPrice: number;
  electricityRate: number;
}
```

### UI Sections

1. **Top inputs row** — driving profile sliders/inputs
2. **Vehicle cards** — editable spec cards, "Add Vehicle" button
3. **Energy scenarios** — 3 columns, editable
4. **Monthly cost breakdown table** — vehicle × cost-component matrix
5. **3-year TCO chart** — line chart, x-axis = month (0-36), y-axis = cumulative $
6. **Scenario summary cards** — for each scenario, show winner and savings vs BMW 430i

### Key UX Considerations

- Persist state in URL params so the share-link captures the user's customized inputs
- Mobile-first: stack columns on small screens
- Show 3-year delta prominently: "IONIQ 6 saves $X over BMW 430i"
- Flag mileage overage in red when annual_miles > lease_allowance

---

## 8. Open Questions / TODO

1. Verify friend's "other monthly miles" — 800 is a placeholder.
2. Cash purchase vs lease modeling — current model only handles lease.
3. EV charging logistics — home charging assumed at residential rate.
4. Insurance estimates — placeholder values.
5. Polestar 3 actual lease deals — pricing varies widely.
6. Add Tesla Model 3 / BMW i4 — natural comparison set extensions.

---

## 9. Quick Sanity-Check Math (using defaults, average energy prices)

| Vehicle | Lease | Fuel | Ins | Maint | Overage | **Monthly** | **3-Year** |
|---|---|---|---|---|---|---|---|
| BMW 430i | $550 | $285 | $225 | $17 | $126 | **$1,203** | **$43,300** |
| IONIQ 6 | $425 | $69 | $175 | $8 | $126 | **$803** | **$28,900** |
| Polestar 3 | $750 | $101 | $250 | $13 | $126 | **$1,240** | **$44,600** |

**Headline**: IONIQ 6 saves ~$14,400 vs BMW 430i over 3 years.
