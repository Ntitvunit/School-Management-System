"use client";
// Same report card layout, usable inside client components (public PIN checker).
import ReportCard from "@/components/ReportCard";
export default function ReportCardClient({ data }: { data: any }) {
  return <ReportCard data={data} />;
}
