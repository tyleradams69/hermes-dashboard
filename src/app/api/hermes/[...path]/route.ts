import { NextRequest, NextResponse } from "next/server";

type HermesRouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export const dynamic = "force-dynamic";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

function getHermesApiUrl() {
  const apiUrl = process.env.HERMES_API_URL;

  if (!apiUrl) {
    throw new Error("HERMES_API_URL is not configured");
  }

  return apiUrl.replace(/\/$/, "");
}

function getHermesApiToken() {
  const token = process.env.HERMES_API_TOKEN;

  if (!token) {
    throw new Error("HERMES_API_TOKEN is not configured");
  }

  return token;
}

function buildTargetUrl(request: NextRequest, path: string[]) {
  const sourceUrl = new URL(request.url);
  const upstreamPath = path.map(encodeURIComponent).join("/");
  const targetUrl = new URL(`/${upstreamPath}${sourceUrl.search}`, getHermesApiUrl());

  return targetUrl.toString();
}

function buildHeaders(request: NextRequest) {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      return;
    }

    if (key.toLowerCase() === "x-hermes-token") {
      return;
    }

    headers.set(key, value);
  });

  headers.set("x-hermes-token", getHermesApiToken());

  if (!headers.has("x-hermes-role")) {
    headers.set("x-hermes-role", "admin");
  }

  return headers;
}

async function proxyHermesRequest(
  request: NextRequest,
  context: HermesRouteContext
) {
  const { path } = await context.params;

  try {
    const response = await fetch(buildTargetUrl(request, path), {
      method: request.method,
      headers: buildHeaders(request),
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.arrayBuffer(),
      cache: "no-store",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Hermes API proxy failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Hermes API proxy failed",
      },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: HermesRouteContext
) {
  return proxyHermesRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: HermesRouteContext
) {
  return proxyHermesRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: HermesRouteContext
) {
  return proxyHermesRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: HermesRouteContext
) {
  return proxyHermesRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: HermesRouteContext
) {
  return proxyHermesRequest(request, context);
}
