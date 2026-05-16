import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_URL = (process.env.BACKEND_INTERNAL_URL ?? "http://localhost:4000").replace(/\/$/, "");
const INTERNAL_TOKEN = process.env.BACKEND_INTERNAL_TOKEN ?? "";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

type RouteContext = { params: Promise<{ slug?: string[] }> };

async function forward(req: NextRequest, context: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { slug = [] } = await context.params;
  const path = "/" + slug.map(encodeURIComponent).join("/");
  const search = req.nextUrl.search;
  const target = `${BACKEND_URL}/api${path}${search}`;

  const outHeaders = new Headers();
  for (const [k, v] of req.headers.entries()) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) outHeaders.set(k, v);
  }
  if (INTERNAL_TOKEN) outHeaders.set("x-internal-token", INTERNAL_TOKEN);
  if (session.user.email) outHeaders.set("x-user-email", session.user.email);
  outHeaders.delete("cookie");

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers: outHeaders,
    redirect: "manual",
  };
  if (hasBody) {
    init.body = req.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (e) {
    return NextResponse.json(
      { error: `proxy: upstream fetch failed: ${(e as Error).message}` },
      { status: 502 },
    );
  }

  const respHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    if (!HOP_BY_HOP.has(k.toLowerCase())) respHeaders.set(k, v);
  }
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: respHeaders,
  });
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return forward(req, ctx);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  return forward(req, ctx);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  return forward(req, ctx);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  return forward(req, ctx);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return forward(req, ctx);
}

export const dynamic = "force-dynamic";
