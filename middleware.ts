import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { edgeAuthConfig } from "@/lib/auth";

const { auth } = NextAuth(edgeAuthConfig);

const publicRoutes = ["/login", "/register", "/invite"];
const adminRoutes = ["/admin"];

function redirectToLogin(req: Parameters<Parameters<typeof auth>[0]>[0]) {
  const url = new URL("/login", req.nextUrl.origin);
  url.searchParams.set("callbackUrl", req.nextUrl.href);
  url.searchParams.set("reason", "expired");
  const response = NextResponse.redirect(url);
  for (const name of [
    "authjs.session-token",
    "__Secure-authjs.session-token",
    "authjs.callback-url",
    "__Secure-authjs.callback-url",
    "authjs.csrf-token",
    "__Host-authjs.csrf-token",
  ]) {
    response.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return response;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/" || pathname === "/setup" || publicRoutes.some((route) => pathname.startsWith(route));
  const hasValidSession = Boolean(req.auth?.user?.id);

  if (!hasValidSession && !isPublic) {
    return redirectToLogin(req);
  }

  if (hasValidSession && adminRoutes.some((route) => pathname.startsWith(route))) {
    if (req.auth?.user?.systemRole !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/forbidden", req.nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
