import { useEffect, useState } from "react";
import type { CivilDate } from "../lib/sky";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const field =
  "w-full appearance-none rounded-none border-b border-ink/25 bg-transparent px-0 py-2 text-ink outline-none transition focus:border-rust";

type Props = {
  value: CivilDate;
  onChange: (next: CivilDate) => void;
};

function NumericField({
  label,
  value,
  min,
  max,
  digits,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  digits: number;
  onCommit: (n: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setDraft(String(value));
      return;
    }
    onCommit(Math.min(max, Math.max(min, Math.round(n))));
  };

  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.28em] text-mute">
        {label}
      </span>
      <input
        className={`${field} font-serif text-3xl`}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        value={focused ? draft : String(value)}
        onFocus={(e) => {
          setFocused(true);
          setDraft(String(value));
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          commit(draft);
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d]/g, "").slice(0, digits);
          setDraft(next);
          if (next.length === digits) {
            const n = Number(next);
            if (n >= min && n <= max) onCommit(n);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
    </label>
  );
}

export function DatePicker({ value, onChange }: Props) {
  const dim = daysInMonth(value.year, value.month);

  const set = (patch: Partial<CivilDate>) => {
    const next = { ...value, ...patch };
    const max = daysInMonth(next.year, next.month);
    onChange({ ...next, day: Math.min(next.day, max) });
  };

  return (
    <div className="grid grid-cols-3 gap-5 sm:gap-8">
      <NumericField
        label="Year"
        value={value.year}
        min={1600}
        max={2399}
        digits={4}
        onCommit={(year) => set({ year })}
      />
      <label className="block">
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.28em] text-mute">
          Month
        </span>
        <select
          className={`${field} font-serif text-3xl`}
          value={value.month}
          onChange={(e) => set({ month: Number(e.target.value) })}
        >
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1} className="bg-dusk text-ink">
              {name}
            </option>
          ))}
        </select>
      </label>
      <NumericField
        label="Day"
        value={Math.min(value.day, dim)}
        min={1}
        max={dim}
        digits={2}
        onCommit={(day) => set({ day })}
      />
    </div>
  );
}
