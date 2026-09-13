export type SkyMood = "day" | "night";

type Props = {
  value: SkyMood;
  onChange: (next: SkyMood) => void;
};

export function SkyMoodToggle({ value, onChange }: Props) {
  const toNight = value === "day";
  return (
    <button
      type="button"
      onClick={() => onChange(toNight ? "night" : "day")}
      className="border border-ink/25 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.26em] text-ink/90 transition hover:border-rust/70 hover:text-ink"
    >
      {toNight ? "Night sky" : "Daylight"}
    </button>
  );
}
