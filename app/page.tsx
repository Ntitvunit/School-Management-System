import { redirect } from "next/navigation";
import { requireMember } from "@/lib/session";

export default async function Home() {
  const { profile } = await requireMember();
  redirect(profile.role === "parent" ? "/this-week" : "/scheme");
}
