import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  // Preview is opt-in development only and never creates an authentication client.
  if (path === "/apercu-partenaire" || path.startsWith("/apercu-partenaire/")) {
    return process.env.NODE_ENV === "development" && process.env.FOREAS_PARTNER_DEMO === "1"
      ? NextResponse.next()
      : new NextResponse("Not found", { status: 404 });
  }
  // Downloads and this read-only adapter authenticate inside their route handler.
  if (path.startsWith("/partner/kit/") || path.startsWith("/api/partner-data/")) return NextResponse.next();
  if (path.startsWith("/fonts/")) return NextResponse.next();
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except :
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - any file with an extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
