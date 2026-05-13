import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const password = body.password;

  const allowedPasswords = [
    process.env.TYLER_DASHBOARD_PASSWORD,
    process.env.JACK_DASHBOARD_PASSWORD,
  ].filter(Boolean);

  if (allowedPasswords.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Dashboard password is not configured" },
      { status: 500 }
    );
  }

  if (!allowedPasswords.includes(password)) {
    return NextResponse.json(
      { ok: false, error: "Invalid password" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("hermes_dashboard_auth", "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
