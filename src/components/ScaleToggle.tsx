export type Scale = "orbit" | "surface";

type Props = {
  value: Scale;
  onChange: (next: Scale) => void;
  disabled?: boolean;
  tone?: "light" | "dark";
};

export function ScaleToggle({ value, onChange, disabled, tone = "dark" }: Props) {
  const inward = value === "orbit";
  const chrome =
    tone === "light"
      ? "border-[#3a2418]/55 bg-[#fff6ea]/35 text-[#3a2418] hover:border-[#3a2418]"
      : "border-ink/25 text-ink/90 hover:border-rust/70 hover:text-ink";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(inward ? "surface" : "orbit")}
      className={`border px-4 py-2 text-[10px] font-medium uppercase tracking-[0.26em] transition disabled:opacity-40 ${chrome}`}
    >
      {inward ? "Zoom in" : "Zoom out"}
    </button>
  );
}
