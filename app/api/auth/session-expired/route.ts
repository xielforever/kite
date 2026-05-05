import { NextResponse, type NextRequest } from "next/server";

function clearAuthCookies(response: NextResponse) {
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
}

export function GET(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("reason", "expired");

  const callbackUrl = request.nextUrl.searchParams.get("callbackUrl");
  if (callbackUrl) {
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
  }

  const response = NextResponse.redirect(loginUrl);
  clearAuthCookies(response);
  return response;
}
