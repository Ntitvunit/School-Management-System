"use client";
export default function PrintButton({ label = "Print" }: { label?: string }) {
  return <button type="button" className="btn ghost small no-print" onClick={() => window.print()}>{label}</button>;
}
