import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_KEY } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  // Clear message instead of a crash when the Supabase settings are missing on Vercel.
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return new NextResponse(
      "Setup needed: the Supabase settings are missing. In Vercel, open this project, go to Settings → Environment Variables, " +
        "add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for Production, then redeploy.\n\n" +
        `Found URL: ${SUPABASE_URL ? "yes" : "no"} · Found key: ${SUPABASE_KEY ? "yes" : "no"}`,
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  let response = NextResponse.next({ request });
  try {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data: { user } } = await supabase.auth.getUser();
    const path = request.nextUrl.pathname;
    const isPublic = path.startsWith("/login") || path.startsWith("/auth");
    if (!user && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  } catch (e) {
    // Never block the page because the session check failed; the page itself checks sign-in again.
    console.error("Middleware session check failed", e);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
