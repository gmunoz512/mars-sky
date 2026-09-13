export type SkyMood = "day" | "night";

type Props = {
  value: SkyMood;
  onChange: (next: SkyMood) => void;
  tone?: "light" | "dark";
};

export function SkyMoodToggle({ value, onChange, tone = "dark" }: Props) {
  const toNight = value === "day";
  const chrome =
    tone === "light"
      ? "border-[#3a2418]/55 bg-[#fff6ea]/35 text-[#3a2418] hover:border-[#3a2418]"
      : "border-ink/25 text-ink/90 hover:border-rust/70 hover:text-ink";
  return (
    <button
      type="button"
      onClick={() => onChange(toNight ? "night" : "day")}
      className={`border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.26em] transition ${chrome}`}
    >
      {toNight ? "Night sky" : "Daylight"}
    </button>
  );
}
