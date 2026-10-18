export type Part = { key: string; label: string; max: number };
export type Band = { min: number; grade: string; remark: string };

export const DEFAULT_PARTS: Part[] = [
  { key: "ca1", label: "1st CA", max: 20 }, { key: "ca2", label: "2nd CA", max: 20 }, { key: "exam", label: "Exam", max: 60 },
];
export const DEFAULT_BANDS: Band[] = [
  { min: 70, grade: "A", remark: "Excellent" }, { min: 60, grade: "B", remark: "Very good" }, { min: 50, grade: "C", remark: "Good" },
  { min: 45, grade: "D", remark: "Fair" }, { min: 40, grade: "E", remark: "Pass" }, { min: 0, grade: "F", remark: "Fail" },
];
export const WAEC_BANDS: Band[] = [
  { min: 75, grade: "A1", remark: "Excellent" }, { min: 70, grade: "B2", remark: "Very good" }, { min: 65, grade: "B3", remark: "Good" },
  { min: 60, grade: "C4", remark: "Credit" }, { min: 55, grade: "C5", remark: "Credit" }, { min: 50, grade: "C6", remark: "Credit" },
  { min: 45, grade: "D7", remark: "Pass" }, { min: 40, grade: "E8", remark: "Pass" }, { min: 0, grade: "F9", remark: "Fail" },
];

export function parts(school: any): Part[] {
  const p = school?.assessment;
  return Array.isArray(p) && p.length ? p : DEFAULT_PARTS;
}
export function bands(school: any): Band[] {
  const b = school?.grading;
  return (Array.isArray(b) && b.length ? b : DEFAULT_BANDS).slice().sort((x: Band, y: Band) => y.min - x.min);
}
export function gradeFor(total: number | null | undefined, bs: Band[]) {
  if (total === null || total === undefined || isNaN(Number(total))) return { grade: "—", remark: "" };
  const b = bs.find((x) => Number(total) >= x.min) || bs[bs.length - 1];
  return { grade: b.grade, remark: b.remark };
}
export function ordinal(n?: number | null) {
  if (!n) return "—";
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
/** Rank values high → low with ties sharing a position (1, 2, 2, 4). */
export function rankMap<T extends string>(entries: [T, number][]) {
  const sorted = entries.slice().sort((a, b) => b[1] - a[1]);
  const out = new Map<T, number>();
  sorted.forEach(([k, v], i) => out.set(k, i > 0 && v === sorted[i - 1][1] ? out.get(sorted[i - 1][0])! : i + 1));
  return out;
}
export const AFFECTIVE = ["Punctuality", "Neatness", "Politeness", "Honesty", "Cooperation", "Attentiveness", "Leadership"];
export const PSYCHOMOTOR = ["Handwriting", "Sports and games", "Drawing and crafts", "Musical skills", "Verbal fluency"];
export const RATING_TEXT = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];
