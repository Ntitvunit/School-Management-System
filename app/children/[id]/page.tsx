import Link from "next/link";
import { requireMember } from "@/lib/session";
import { loadChild } from "@/lib/childData";
import ChildOverview from "@/components/ChildOverview";

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile, school } = await requireMember();
  const res = await loadChild(supabase, school, id);
  return (
    <main className="page" style={{ maxWidth: 1000 }}>
      {profile.role === "parent" && <Link href="/children" className="small">← My children</Link>}
      {"error" in res && res.error ? <div className="card"><div className="error">{res.error}</div></div>
        : <ChildOverview data={(res as any).data} thisWeek={(res as any).thisWeek} announcements={(res as any).announcements} />}
    </main>
  );
}
