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

export function DatePicker({ value, onChange }: Props) {
  const dim = daysInMonth(value.year, value.month);
  const day = Math.min(value.day, dim);

  const set = (patch: Partial<CivilDate>) => {
    const next = { ...value, ...patch };
    const max = daysInMonth(next.year, next.month);
    onChange({ ...next, day: Math.min(next.day, max) });
  };

  return (
    <div className="grid grid-cols-3 gap-5 sm:gap-8">
      <label className="block">
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.28em] text-mute">
          Year
        </span>
        <input
          className={`${field} font-serif text-3xl`}
          type="number"
          min={1600}
          max={2399}
          value={value.year}
          onChange={(e) => {
            const year = Number(e.target.value);
            if (!Number.isFinite(year)) return;
            set({ year: Math.min(2399, Math.max(1600, Math.round(year))) });
          }}
        />
      </label>
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
      <label className="block">
        <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.28em] text-mute">
          Day
        </span>
        <input
          className={`${field} font-serif text-3xl`}
          type="number"
          min={1}
          max={dim}
          value={day}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isFinite(next)) return;
            set({ day: Math.min(dim, Math.max(1, Math.round(next))) });
          }}
        />
      </label>
    </div>
  );
}
