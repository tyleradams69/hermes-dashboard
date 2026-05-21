export type SupabaseAuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

type SupabaseTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      role?: string;
    };
    app_metadata?: {
      role?: string;
      roles?: string[];
    };
  };
  error?: string;
  error_description?: string;
  msg?: string;
};

function getSupabaseAuthConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase auth is not configured");
  }

  return {
    url: url.replace(/\/+$/, ""),
    anonKey,
  };
}

function getSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase admin auth is not configured");
  }

  return {
    url: url.replace(/\/+$/, ""),
    serviceRoleKey,
  };
}

function mapSupabaseUser(data: SupabaseTokenResponse["user"]): SupabaseAuthUser | null {
  const userId = data?.id;
  const userEmail = data?.email;

  if (!userId || !userEmail) {
    return null;
  }

  const metadata = data.user_metadata || {};
  const appMetadata = data.app_metadata || {};

  return {
    id: userId,
    email: userEmail,
    name: metadata.full_name || metadata.name,
    role: metadata.role || appMetadata.role || appMetadata.roles?.[0] || "employee",
  };
}

export async function authenticateSupabaseEmployee(email: string, password: string) {
  const { url, anonKey } = getSupabaseAuthConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    cache: "no-store",
    headers: new Headers({
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": "application/json",
    }),
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json().catch(() => ({}))) as SupabaseTokenResponse;

  if (!response.ok) {
    return {
      ok: false as const,
      error: data.error_description || data.msg || data.error || "Invalid email or password",
      status: response.status,
    };
  }

  const user = mapSupabaseUser(data.user);

  if (!data.access_token || !user) {
    return {
      ok: false as const,
      error: "Supabase auth response was missing user details",
      status: 502,
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function updateSupabaseEmployee(
  userId: string,
  updates: { name?: string; password?: string }
) {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const payload: { user_metadata?: { full_name: string }; password?: string } = {};

  if (updates.name !== undefined) {
    payload.user_metadata = { full_name: updates.name };
  }

  if (updates.password !== undefined) {
    payload.password = updates.password;
  }

  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    cache: "no-store",
    headers: new Headers({
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    }),
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => ({}))) as SupabaseTokenResponse["user"] & {
    error?: string;
    error_description?: string;
    msg?: string;
  };

  if (!response.ok) {
    return {
      ok: false as const,
      error: data.error_description || data.msg || data.error || "Unable to update account",
      status: response.status,
    };
  }

  const user = mapSupabaseUser(data);
  if (!user) {
    return {
      ok: false as const,
      error: "Supabase update response was missing user details",
      status: 502,
    };
  }

  return {
    ok: true as const,
    user,
  };
}
