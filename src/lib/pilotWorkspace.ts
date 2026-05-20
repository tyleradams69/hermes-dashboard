export type WorkspaceSettings = {
  notifications: boolean;
  supervision: "supervised" | "semi_autonomous";
  weeklyDigest: boolean;
};

export type OnboardingReadinessInput = {
  hasBusiness?: boolean;
  hasSettings?: boolean;
  hasIntegrations?: boolean;
  hasActivity?: boolean;
};

export type OnboardingChecklistItem = {
  id: "business" | "settings" | "integrations" | "activity";
  label: string;
  description: string;
  complete: boolean;
};

export const workspaceSettingsKey = "liminull:workspace-settings";

export const defaultWorkspaceSettings: WorkspaceSettings = {
  notifications: true,
  supervision: "supervised",
  weeklyDigest: true,
};

export function parseWorkspaceSettings(raw: string | null): WorkspaceSettings {
  if (!raw) return defaultWorkspaceSettings;

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceSettings>;

    return {
      notifications:
        typeof parsed.notifications === "boolean"
          ? parsed.notifications
          : defaultWorkspaceSettings.notifications,
      supervision:
        parsed.supervision === "semi_autonomous" || parsed.supervision === "supervised"
          ? parsed.supervision
          : defaultWorkspaceSettings.supervision,
      weeklyDigest:
        typeof parsed.weeklyDigest === "boolean"
          ? parsed.weeklyDigest
          : defaultWorkspaceSettings.weeklyDigest,
    };
  } catch {
    return defaultWorkspaceSettings;
  }
}

export function serializeWorkspaceSettings(settings: WorkspaceSettings) {
  return JSON.stringify(settings);
}

export function slugifyClientId(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "default"
  );
}

export function getClientNotesKey(clientId: string) {
  return `liminull:client-notes:${slugifyClientId(clientId)}`;
}

export function buildOnboardingChecklist(
  input: OnboardingReadinessInput
): OnboardingChecklistItem[] {
  return [
    {
      id: "business",
      label: "Client workspace created",
      description: "Business profile exists and can be opened from Clients.",
      complete: Boolean(input.hasBusiness),
    },
    {
      id: "settings",
      label: "Pilot settings saved",
      description: "Supervision mode, alerts, and pilot preferences are captured.",
      complete: Boolean(input.hasSettings),
    },
    {
      id: "integrations",
      label: "Integrations checked",
      description: "At least one intake, inbox, calendar, or CRM channel has been reviewed.",
      complete: Boolean(input.hasIntegrations),
    },
    {
      id: "activity",
      label: "First signal/activity ready",
      description: "Dashboard has enough data for the pilot kickoff conversation.",
      complete: Boolean(input.hasActivity),
    },
  ];
}

export function buildFeedbackMailto({
  businessId = "unknown",
  page = "dashboard",
  email = "lab@liminullai.com",
}: {
  businessId?: string;
  page?: string;
  email?: string;
}) {
  const subject = encodeURIComponent("Liminull dashboard feedback");
  const body = encodeURIComponent(
    [
      "What happened?",
      "",
      "What should we improve?",
      "",
      "Context:",
      `business: ${businessId}`,
      `page: ${page}`,
    ].join("\n")
  );

  return `mailto:${email}?subject=${subject}&body=${body}`;
}
