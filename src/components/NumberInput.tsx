import { useState } from "react";

interface Props {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  hint?: string;
  warn?: boolean;
  decimals?: number;
}

export function NumberInput({
  label,
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
  min = 0,
  hint,
  warn,
  decimals,
}: Props) {
  // Keep a local string so the user can type freely (e.g. clear the field)
  // without us snapping back to 0 mid-edit. Resync with the prop only when
  // an external change actually replaces the numeric value — using the
  // "derived state with previous prop tracking" pattern instead of useEffect.
  const [text, setText] = useState<string>(String(value ?? ""));
  const [lastValue, setLastValue] = useState<number>(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(String(value ?? ""));
  }

  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <div
        className={`mt-1 flex items-baseline gap-1 rounded-md border bg-panel2 px-2.5 py-2 transition-colors ${
          warn ? "border-warn/60" : "border-line focus-within:border-muted"
        }`}
      >
        {prefix && (
          <span className="shrink-0 text-[14px] leading-none text-muted">
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          // `min-w-0` so the input shrinks inside flex without forcing a
          // suffix off-screen; `flex-1` lets the value claim the
          // remaining row. Right-align values when a suffix is present so
          // short numbers (`4`, `7`) sit next to the unit instead of
          // stranding a wide gap. Left-align is fine for prefix-only.
          className={`min-w-0 flex-1 bg-transparent text-[15px] leading-none outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
            suffix ? "text-right" : "text-left"
          }`}
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            if (raw === "" || raw === "-") return;
            const n = Number(raw);
            if (!Number.isNaN(n)) {
              onChange(decimals != null ? Number(n.toFixed(decimals)) : n);
            }
          }}
          onBlur={() => {
            if (text === "" || Number.isNaN(Number(text))) {
              setText(String(value));
            }
          }}
        />
        {suffix && (
          <span className="shrink-0 whitespace-nowrap text-[12px] leading-none text-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <span className={`mt-1 block text-[11px] ${warn ? "text-warn" : "text-muted"}`}>
          {hint}
        </span>
      )}
    </label>
  );
}
