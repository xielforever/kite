import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicRoutes = ["/login", "/register"];

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
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  const hasValidSession = Boolean(req.auth?.user?.id);

  if (!hasValidSession && !isPublic) {
    return redirectToLogin(req);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
