import type { SkyBody } from "../lib/sky";

export type SkyLookTarget = {
  az: number;
  alt: number;
};

type Props = {
  earth: SkyBody | null;
  moons: SkyBody[];
  onLook: (target: SkyLookTarget) => void;
};

function bearing(az: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const wrapped = ((az % 360) + 360) % 360;
  return dirs[Math.round(wrapped / 45) % 8]!;
}

function Chip({
  label,
  hint,
  tone,
  onClick,
}: {
  label: string;
  hint: string;
  tone: "earth" | "moon";
  onClick: () => void;
}) {
  const dot = tone === "earth" ? "bg-[#8ec6e6]" : "bg-[#e0b48a]";
  return (
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto inline-flex items-center gap-2 border border-ink/25 bg-dusk/40 px-3 py-1.5 text-left backdrop-blur-[2px] transition hover:border-rust/70"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      <span>
        <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-ink/90">
          {label}
        </span>
        <span className="mt-0.5 block text-[10px] tracking-[0.12em] text-mute">{hint}</span>
      </span>
    </button>
  );
}

export function SkyCallouts({ earth, moons, onLook }: Props) {
  if (!earth && moons.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {earth && (
        <Chip
          tone="earth"
          label="Earth is up"
          hint={`${bearing(earth.az)} · look`}
          onClick={() => onLook(earth)}
        />
      )}
      {moons.map((moon) => (
        <Chip
          key={moon.id}
          tone="moon"
          label={`${moon.name} tonight`}
          hint={`${bearing(moon.az)} · look`}
          onClick={() => onLook(moon)}
        />
      ))}
    </div>
  );
}
