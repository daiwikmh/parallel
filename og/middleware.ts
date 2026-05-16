import { auth } from "@/auth";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/chat", "/sources", "/vault", "/agent"];

const AUTH_DISABLED = process.env.AUTH_ENABLED === "false";

function gate(req: NextRequest & { auth?: unknown }): NextResponse {
  if (AUTH_DISABLED) return NextResponse.next();
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!isProtected) return NextResponse.next();
  if (req.auth) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

const middleware = AUTH_DISABLED ? () => NextResponse.next() : auth(gate as never);

export default middleware;

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
