// URL-state serialization.
//
// Strategy: only persist *overrides* of defaults so the URL stays short when
// the user hasn't customized much. Order/IDs of vehicles are preserved via
// `v` param so re-ordering and adding/removing vehicles survive a share.

import { DEFAULT_DRIVING, DEFAULT_SCENARIOS, DEFAULT_VEHICLES } from "./defaults";
import type {
  DrivingProfile,
  EnergyScenario,
  ScenarioKey,
  Vehicle,
} from "./types";

export interface AppState {
  vehicles: Vehicle[];
  driving: DrivingProfile;
  scenarios: EnergyScenario[];
  scenarioKey: ScenarioKey;
  annualSalary: number;
}

const DEFAULT_SALARY = 185_000;

export function defaultState(): AppState {
  return {
    // Deep-clone the constant arrays so component edits never mutate defaults.
    vehicles: DEFAULT_VEHICLES.map((v) => ({ ...v })),
    driving: { ...DEFAULT_DRIVING },
    scenarios: DEFAULT_SCENARIOS.map((s) => ({ ...s })),
    scenarioKey: "average",
    annualSalary: DEFAULT_SALARY,
  };
}

// ---------- Encode --------------------------------------------------------
//
// We use a compact key=value;key=value form per vehicle to keep URLs readable
// without dragging in a JSON dependency. Keys are short letter codes:
//   n=name  l=lease  e=efficiency  g=isGas(1/0)  i=insurance  m=maintenance
//   p=msrp  c=color  s=shortName  f=fuelType
// Only fields that differ from the matching default vehicle are emitted; if a
// vehicle isn't in the defaults, all fields are emitted.

const VKEYS: Record<keyof Vehicle, string> = {
  id: "id",
  name: "n",
  shortName: "s",
  color: "c",
  msrp: "p",
  monthlyLease: "l",
  downPayment: "d",
  efficiency: "e",
  isGas: "g",
  monthlyInsurance: "i",
  annualMaintenance: "m",
  fuelType: "f",
};

function encodeVehicle(v: Vehicle): string {
  const base = DEFAULT_VEHICLES.find((d) => d.id === v.id);
  const parts: string[] = [`id=${v.id}`];
  (Object.keys(VKEYS) as (keyof Vehicle)[]).forEach((field) => {
    if (field === "id") return;
    const val = v[field];
    const baseVal = base ? base[field] : undefined;
    if (base && val === baseVal) return;
    let serialized: string;
    if (typeof val === "boolean") serialized = val ? "1" : "0";
    else serialized = String(val);
    parts.push(`${VKEYS[field]}=${encodeURIComponent(serialized)}`);
  });
  return parts.join(";");
}

function decodeVehicle(s: string): Vehicle | null {
  const pairs = s.split(";").filter(Boolean);
  const obj: Record<string, string> = {};
  for (const p of pairs) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    obj[p.slice(0, eq)] = decodeURIComponent(p.slice(eq + 1));
  }
  if (!obj.id) return null;
  const base = DEFAULT_VEHICLES.find((d) => d.id === obj.id);

  const get = <K extends keyof Vehicle>(field: K, code: string): Vehicle[K] => {
    if (obj[code] !== undefined) {
      const raw = obj[code];
      if (field === "isGas") return (raw === "1") as Vehicle[K];
      const n = Number(raw);
      if (!Number.isNaN(n) && typeof base?.[field] === "number") {
        return n as Vehicle[K];
      }
      return raw as Vehicle[K];
    }
    if (base) return base[field];
    // No default → can't reconstruct. Caller should guard.
    return undefined as unknown as Vehicle[K];
  };

  const v: Vehicle = {
    id: obj.id,
    name: get("name", "n") ?? obj.id,
    shortName: get("shortName", "s") ?? obj.id,
    color: get("color", "c") ?? "#94a3b8",
    msrp: Number(get("msrp", "p")) || 0,
    monthlyLease: Number(get("monthlyLease", "l")) || 0,
    downPayment: Number(get("downPayment", "d")) || 0,
    efficiency: Number(get("efficiency", "e")) || 0,
    isGas: get("isGas", "g") as boolean,
    monthlyInsurance: Number(get("monthlyInsurance", "i")) || 0,
    annualMaintenance: Number(get("annualMaintenance", "m")) || 0,
    fuelType: (get("fuelType", "f") as Vehicle["fuelType"]) ?? "regular",
  };
  return v;
}

function encodeDriving(d: DrivingProfile): string {
  const def = DEFAULT_DRIVING;
  const parts: string[] = [];
  if (d.roundTripMiles !== def.roundTripMiles) parts.push(`r=${d.roundTripMiles}`);
  if (d.tripsPerMonth !== def.tripsPerMonth) parts.push(`t=${d.tripsPerMonth}`);
  if (d.otherMonthlyMiles !== def.otherMonthlyMiles) parts.push(`o=${d.otherMonthlyMiles}`);
  if (d.leaseAllowanceAnnual !== def.leaseAllowanceAnnual) parts.push(`a=${d.leaseAllowanceAnnual}`);
  if (d.overagePerMile !== def.overagePerMile) parts.push(`x=${d.overagePerMile}`);
  return parts.join(";");
}

function decodeDriving(s: string): DrivingProfile {
  const out = { ...DEFAULT_DRIVING };
  if (!s) return out;
  for (const p of s.split(";")) {
    const [k, v] = p.split("=");
    const n = Number(v);
    if (Number.isNaN(n)) continue;
    if (k === "r") out.roundTripMiles = n;
    else if (k === "t") out.tripsPerMonth = n;
    else if (k === "o") out.otherMonthlyMiles = n;
    else if (k === "a") out.leaseAllowanceAnnual = n;
    else if (k === "x") out.overagePerMile = n;
  }
  return out;
}

function encodeScenarios(list: EnergyScenario[]): string {
  // 3 scenarios in fixed order: low,avg,high → gas,kwh pairs.
  const def = DEFAULT_SCENARIOS;
  const parts: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const d = def[i];
    if (!d || s.gasPrice !== d.gasPrice || s.electricityRate !== d.electricityRate) {
      parts.push(`${s.gasPrice},${s.electricityRate}`);
    } else {
      parts.push("");
    }
  }
  return parts.join("|");
}

function decodeScenarios(s: string): EnergyScenario[] {
  const out = DEFAULT_SCENARIOS.map((x) => ({ ...x }));
  if (!s) return out;
  const chunks = s.split("|");
  for (let i = 0; i < Math.min(3, chunks.length); i++) {
    const chunk = chunks[i];
    if (!chunk) continue;
    const [g, e] = chunk.split(",").map(Number);
    if (!Number.isNaN(g)) out[i].gasPrice = g;
    if (!Number.isNaN(e)) out[i].electricityRate = e;
  }
  return out;
}

export function encodeState(state: AppState): string {
  const sp = new URLSearchParams();
  // Vehicles: comma-separated, each vehicle uses ; for fields.
  const vEncoded = state.vehicles.map(encodeVehicle).join(",");
  if (vEncoded) sp.set("v", vEncoded);
  const d = encodeDriving(state.driving);
  if (d) sp.set("d", d);
  const sc = encodeScenarios(state.scenarios);
  if (sc.replace(/\|/g, "") !== "") sp.set("s", sc);
  if (state.scenarioKey !== "average") sp.set("k", state.scenarioKey);
  if (state.annualSalary !== DEFAULT_SALARY)
    sp.set("y", String(Math.round(state.annualSalary)));
  return sp.toString();
}

export function decodeState(query: string): AppState {
  const sp = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  const base = defaultState();

  const vRaw = sp.get("v");
  if (vRaw) {
    const decoded = vRaw
      .split(",")
      .map((s) => decodeVehicle(s))
      .filter((v): v is Vehicle => !!v);
    if (decoded.length > 0) base.vehicles = decoded;
  }

  const dRaw = sp.get("d");
  if (dRaw) base.driving = decodeDriving(dRaw);

  const sRaw = sp.get("s");
  if (sRaw) base.scenarios = decodeScenarios(sRaw);

  const kRaw = sp.get("k");
  if (kRaw === "low" || kRaw === "average" || kRaw === "high") {
    base.scenarioKey = kRaw;
  }

  const yRaw = sp.get("y");
  if (yRaw) {
    const y = Number(yRaw);
    if (Number.isFinite(y) && y > 0) base.annualSalary = y;
  }

  return base;
}
