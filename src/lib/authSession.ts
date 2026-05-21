export type DashboardSessionUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

type DashboardSessionPayload = DashboardSessionUser & {
  exp: number;
};

function base64UrlEncode(value: string) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(value).toString("base64url");
  }

  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  return atob(padded);
}

async function hmacSha256(message: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  if (typeof Buffer !== "undefined") {
    return Buffer.from(signature).toString("base64url");
  }

  const bytes = new Uint8Array(signature);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

export async function createDashboardSession(
  user: DashboardSessionUser,
  secret: string,
  ttlSeconds: number
) {
  const payload: DashboardSessionPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || "employee",
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmacSha256(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifyDashboardSession(token: string | undefined, secret: string | undefined) {
  if (!token || !secret) {
    return null;
  }

  const [encodedPayload, signature, extra] = token.split(".");
  if (!encodedPayload || !signature || extra) {
    return null;
  }

  const expectedSignature = await hmacSha256(encodedPayload, secret);
  if (signature !== expectedSignature) {
    return null;
  }

  let payload: DashboardSessionPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  const id = safeString(payload.id);
  const email = safeString(payload.email);
  if (!id || !email || typeof payload.exp !== "number") {
    return null;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return {
    id,
    email,
    name: safeString(payload.name),
    role: safeString(payload.role) || "employee",
  };
}
