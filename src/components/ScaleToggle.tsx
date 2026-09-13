export type Scale = "orbit" | "surface";

type Props = {
  value: Scale;
  onChange: (next: Scale) => void;
  disabled?: boolean;
};

export function ScaleToggle({ value, onChange, disabled }: Props) {
  const inward = value === "orbit";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(inward ? "surface" : "orbit")}
      className="border border-ink/25 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.26em] text-ink/90 transition hover:border-rust/70 hover:text-ink disabled:opacity-40"
    >
      {inward ? "Zoom in" : "Zoom out"}
    </button>
  );
}
