import { readServerEnv } from "./env";

export type SupabaseAuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: string;
};

export type SupabaseTeamAccount = SupabaseAuthUser & {
  emailConfirmed: boolean;
};

export type SupabaseEmployeeAccount = SupabaseTeamAccount;

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
  const url = readServerEnv("SUPABASE_URL") || readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const apiKey =
    readServerEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    readServerEnv("SUPABASE_ANON_KEY") ||
    readServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  if (!url || !apiKey) {
    throw new Error("Supabase auth is not configured");
  }

  return {
    url: url.replace(/\/+$/, ""),
    apiKey,
  };
}

function getSupabaseAdminConfig() {
  const url = readServerEnv("SUPABASE_URL") || readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");

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

type SupabaseAdminUser = NonNullable<SupabaseTokenResponse["user"]> & {
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
};

function mapSupabaseTeamAccount(data: SupabaseAdminUser): SupabaseTeamAccount | null {
  const user = mapSupabaseUser(data);
  if (!user) return null;

  return {
    ...user,
    emailConfirmed: Boolean(data.email_confirmed_at || data.confirmed_at),
  };
}

function sortTeamByName(accounts: SupabaseTeamAccount[]) {
  return [...accounts].sort((a, b) => {
    const roleCompare = (a.role || "employee").localeCompare(b.role || "employee");
    const nameCompare = (a.name || a.email).localeCompare(b.name || b.email);
    return roleCompare || nameCompare || a.email.localeCompare(b.email);
  });
}

function sortEmployeesByName(employees: SupabaseEmployeeAccount[]) {
  return [...employees].sort((a, b) => {
    const nameCompare = (a.name || a.email).localeCompare(b.name || b.email);
    return nameCompare || a.email.localeCompare(b.email);
  });
}

export async function listSupabaseTeamAccounts() {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const response = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, {
    method: "GET",
    cache: "no-store",
    headers: new Headers({
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    }),
  });
  const data = (await response.json().catch(() => ({}))) as {
    users?: SupabaseAdminUser[];
    error?: string;
    error_description?: string;
    msg?: string;
  };

  if (!response.ok) {
    return {
      ok: false as const,
      error: data.error_description || data.msg || data.error || "Unable to list team accounts",
      status: response.status,
    };
  }

  const accounts = sortTeamByName(
    (data.users || [])
      .map(mapSupabaseTeamAccount)
      .filter((account): account is SupabaseTeamAccount => Boolean(account))
  );

  return {
    ok: true as const,
    accounts,
  };
}

export async function listSupabaseEmployees() {
  const result = await listSupabaseTeamAccounts();

  if (!result.ok) {
    return result;
  }

  const employees = sortEmployeesByName(result.accounts.filter((employee) => employee.role !== "admin"));

  return {
    ok: true as const,
    employees,
  };
}

export async function authenticateSupabaseEmployee(email: string, password: string) {
  const { url, apiKey } = getSupabaseAuthConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    cache: "no-store",
    headers: new Headers({
      apikey: apiKey,
      authorization: `Bearer ${apiKey}`,
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

export async function createSupabaseEmployee(input: {
  email: string;
  name: string;
  password: string;
  role: "admin" | "employee";
}) {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const payload = {
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.name,
      name: input.name,
      role: input.role,
    },
    app_metadata: {
      role: input.role,
    },
  };

  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
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
      error: data.error_description || data.msg || data.error || "Unable to create account",
      status: response.status,
    };
  }

  const user = mapSupabaseUser(data);
  if (!user) {
    return {
      ok: false as const,
      error: "Supabase create response was missing user details",
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
  updates: { name?: string; password?: string; role?: "admin" | "employee" }
) {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();
  const payload: { user_metadata?: { full_name?: string; name?: string; role?: "admin" | "employee" }; password?: string } = {};

  if (updates.name !== undefined || updates.role !== undefined) {
    payload.user_metadata = {};
    if (updates.name !== undefined) {
      payload.user_metadata.full_name = updates.name;
      payload.user_metadata.name = updates.name;
    }
    if (updates.role !== undefined) {
      payload.user_metadata.role = updates.role;
    }
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
