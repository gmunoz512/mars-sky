import { outlineControlClass } from "./outlineControl";

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
      className={`${outlineControlClass} disabled:opacity-40`}
    >
      {inward ? "Zoom in" : "Zoom out"}
    </button>
  );
}
