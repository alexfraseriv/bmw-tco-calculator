import { useEffect, useState } from "react";

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
  // without us snapping back to 0 mid-edit.
  const [text, setText] = useState<string>(String(value ?? ""));

  useEffect(() => {
    setText(String(value ?? ""));
  }, [value]);

  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-muted">
        {label}
      </span>
      <div
        className={`mt-1 flex items-center rounded-md border bg-panel2 px-2 py-1.5 transition-colors ${
          warn ? "border-warn/60" : "border-line focus-within:border-muted"
        }`}
      >
        {prefix && <span className="mr-1 text-muted text-sm">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          className="w-full bg-transparent text-base outline-none"
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
        {suffix && <span className="ml-1 text-muted text-sm">{suffix}</span>}
      </div>
      {hint && (
        <span className={`mt-1 block text-[11px] ${warn ? "text-warn" : "text-muted"}`}>
          {hint}
        </span>
      )}
    </label>
  );
}
