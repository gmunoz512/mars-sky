import { jezeroClock } from "../lib/sol";
import type { SkyModel } from "../lib/sky";

type Props = {
  sky: SkyModel;
};

export function SolClock({ sky }: Props) {
  const clock = jezeroClock(sky.jd, sky.utc);
  return (
    <div className="text-right tabular-nums">
      <p className="font-serif text-2xl leading-none tracking-tight sm:text-3xl">{clock.ltst}</p>
      <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-mute">
        LTST · midnight
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.24em] text-rust">{clock.solLabel}</p>
    </div>
  );
}
