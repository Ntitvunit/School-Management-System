import Link from "next/link";
import { requireMember } from "@/lib/session";
import ReportCard from "@/components/ReportCard";
import PrintButton from "@/components/PrintButton";

export default async function ReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ term?: string; session?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, profile, school } = await requireMember();
  const term = Number(sp.term) || school.current_term;
  const session = sp.session || school.current_session;
  const { data, error } = await supabase.rpc("get_report_card", { p_student: id, p_session: session, p_term: term });
  const back = ["parent", "student"].includes(profile.role) ? `/children/${id}` : `/students/${id}`;
  return (
    <main className="page" style={{ maxWidth: 1000 }}>
      <div className="row no-print" style={{ justifyContent: "space-between" }}>
        <Link href={back} className="small">← Back</Link>
        <div className="row">
          {[1, 2, 3].map((t) => <Link key={t} className={`btn small ${t === term ? "" : "ghost"}`} href={`/results/report/${id}?term=${t}&session=${encodeURIComponent(session)}`}>Term {t}</Link>)}
          <PrintButton label="Print / save as PDF" />
        </div>
      </div>
      {error ? <div className="card"><div className="error">{error.message}</div></div>
        : !data ? <div className="card">No report found.</div>
        : <>
            {!data.published && <div className="notice no-print">Draft: this result is not yet published to parents and students.</div>}
            <ReportCard data={data} />
          </>}
    </main>
  );
}
