export function naira(n: number | string | null | undefined) {
  const v = Number(n || 0);
  return "₦" + v.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
