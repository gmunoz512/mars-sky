export type Scale = "orbit" | "surface";

type Props = {
  value: Scale;
  onChange: (next: Scale) => void;
  disabled?: boolean;
};

export function ScaleToggle({ value, onChange, disabled }: Props) {
  const btn = (id: Scale, label: string) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(id)}
      className={`px-3 py-1 text-[10px] font-medium uppercase tracking-[0.22em] transition ${
        value === id ? "bg-ink/10 text-ink" : "text-mute hover:text-ink/80"
      } disabled:opacity-40`}
    >
      {label}
    </button>
  );

  return (
    <div className="inline-flex border border-ink/15">
      {btn("orbit", "Orbit")}
      {btn("surface", "Surface")}
    </div>
  );
}
