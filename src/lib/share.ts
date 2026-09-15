import type { CivilDate } from "./sky";

export const DEFAULT_DATE: CivilDate = { year: 2021, month: 2, day: 18 };

export type ViewMode = "orbit" | "surface";

export type ShareState = {
  date: CivilDate;
  view: ViewMode;
};

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

export function sameDate(a: CivilDate, b: CivilDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function formatIsoDate(date: CivilDate): string {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatShareHeadline(date: CivilDate): string {
  const month = MONTHS[date.month - 1] ?? "January";
  return `${date.day} ${month} ${date.year}`;
}

export function parseIsoDate(raw: string | null): CivilDate | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (year < 1600 || year > 2399) return null;
  if (month < 1 || month > 12) return null;
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > dim) return null;
  return { year, month, day };
}

export function parseShareSearch(
  search: string,
  fallback: CivilDate = DEFAULT_DATE,
): ShareState & { fromShare: boolean } {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(q);
  const date = parseIsoDate(params.get("d"));
  const v = params.get("v");
  const view: ViewMode = v === "surface" ? "surface" : "orbit";
  return {
    date: date ?? fallback,
    view,
    fromShare: date !== null || v === "surface" || v === "orbit",
  };
}

export function formatShareSearch(state: ShareState): string {
  const params = new URLSearchParams();
  params.set("d", formatIsoDate(state.date));
  if (state.view === "surface") params.set("v", "surface");
  return params.toString();
}

export function buildShareUrl(
  state: ShareState,
  loc: { origin: string; pathname: string },
): string {
  const path = loc.pathname || "/";
  return `${loc.origin}${path}?${formatShareSearch(state)}`;
}

export function shareHref(state: ShareState): string {
  if (typeof window === "undefined") return `?${formatShareSearch(state)}`;
  return buildShareUrl(state, window.location);
}

export function shareCardCopy(date: CivilDate): { title: string; text: string } {
  const when = formatShareHeadline(date);
  return {
    title: "My birthday over Jezero",
    text: `My birthday over Jezero — ${when}`,
  };
}

export function isDefaultShare(state: ShareState): boolean {
  return sameDate(state.date, DEFAULT_DATE) && state.view === "orbit";
}
