export const LEVELS: { id: string; name: string }[] = [
  { id: "pre_primary", name: "Pre-primary (Pre-Nursery to Nursery 3)" },
  { id: "primary", name: "Primary (Primary 1 to 6)" },
  { id: "jss", name: "Junior Secondary (JSS 1 to 3)" },
  { id: "sss", name: "Senior Secondary (SS 1 to 3)" },
];
export const DEFAULT_LEVELS = ["pre_primary", "primary"];
export function schoolLevels(school: any): string[] {
  return Array.isArray(school?.levels) && school.levels.length ? school.levels : DEFAULT_LEVELS;
}
