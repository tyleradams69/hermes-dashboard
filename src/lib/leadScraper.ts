export type LeadSource = "google_places" | "linkedin" | "facebook" | "reddit" | "indeed";

export type LeadSearchInput = {
  business: string;
  location: string;
  distanceMiles?: number;
  niche?: string;
  onlyWithoutWebsite?: boolean;
  hasPhoneOnly?: boolean;
  minRating?: number;
  minReviews?: number;
  weakWebsiteCandidate?: boolean;
};

export type LeadSourceLink = {
  source: Exclude<LeadSource, "google_places">;
  label: string;
  url: string;
  query: string;
};

export type LeadRecord = {
  id: string;
  company: string;
  source: LeadSource;
  location: string;
  niche: string;
  size: "solo" | "local" | "mid-market" | "enterprise" | "unknown";
  aiIntent: "High" | "Medium" | "Needs qualification";
  evidence: string[];
  rating?: number;
  reviewCount?: number;
  phone?: string;
  localPhone?: string;
  website?: string;
  score: number;
};

type GooglePlace = {
  place_id?: string;
  name?: string;
  formatted_address?: string;
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  website?: string;
};

export type GooglePlaceDetails = {
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
};

function cleanPart(value: string | undefined) {
  return (value || "").trim().replace(/\s+/g, " ");
}

function searchPhrase(input: LeadSearchInput, intent: string) {
  return [input.business, input.location, input.niche, intent]
    .map(cleanPart)
    .filter(Boolean)
    .join(" ");
}

export function buildAiIntentQueries(input: LeadSearchInput) {
  const baseInput = { ...input, niche: "" };
  return [
    searchPhrase(input, "AI automation"),
    searchPhrase(baseInput, "hiring AI automation"),
    searchPhrase(baseInput, "looking for AI integration"),
    searchPhrase(baseInput, "ChatGPT automation"),
    searchPhrase(baseInput, "workflow automation"),
  ];
}

function googleSearchUrl(query: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function buildLeadSourceLinks(input: LeadSearchInput): LeadSourceLink[] {
  const base = [input.business, input.location, input.niche]
    .map(cleanPart)
    .filter(Boolean)
    .join(" ");
  const aiTerms = "AI OR automation OR ChatGPT OR \"artificial intelligence\"";

  const linkedInQuery = `site:linkedin.com/company ${base} ${aiTerms}`;
  const facebookQuery = `site:facebook.com ${base} ${aiTerms}`;
  const redditQuery = `${base} ${aiTerms}`;
  const indeedQuery = `${base} AI automation jobs`;

  return [
    {
      source: "linkedin",
      label: "LinkedIn company search",
      query: linkedInQuery,
      url: googleSearchUrl(linkedInQuery),
    },
    {
      source: "facebook",
      label: "Facebook business/page search",
      query: facebookQuery,
      url: googleSearchUrl(facebookQuery),
    },
    {
      source: "reddit",
      label: "Reddit conversations search",
      query: `site:reddit.com/search ${redditQuery}`,
      url: googleSearchUrl(`site:reddit.com/search ${redditQuery}`),
    },
    {
      source: "indeed",
      label: "Indeed AI hiring signal search",
      query: indeedQuery,
      url: `https://www.indeed.com/jobs?q=${encodeURIComponent(indeedQuery)}&l=${encodeURIComponent(input.location)}`,
    },
  ];
}

export function buildPlacesTextSearchUrl({
  business,
  location,
  distanceMiles = 15,
  niche,
  apiKey,
}: LeadSearchInput & { apiKey: string }) {
  const query = [business, niche, "in", location]
    .map(cleanPart)
    .filter(Boolean)
    .join(" ");
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("radius", String(Math.round(distanceMiles * 1609.34)));
  url.searchParams.set("key", apiKey);
  return url.toString();
}

export function buildPlaceDetailsUrl(placeId: string, apiKey: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "formatted_phone_number,international_phone_number,website");
  url.searchParams.set("key", apiKey);
  return url.toString();
}

function inferSize(place: GooglePlace): LeadRecord["size"] {
  const reviews = place.user_ratings_total || 0;
  if (reviews >= 1000) return "mid-market";
  if (reviews >= 50) return "local";
  if (reviews > 0) return "solo";
  return "unknown";
}

function inferIntent(place: GooglePlace): LeadRecord["aiIntent"] {
  const text = [place.name, place.formatted_address, ...(place.types || [])]
    .join(" ")
    .toLowerCase();

  if (/\b(ai|automation|software|technology|digital|chatgpt)\b/.test(text)) {
    return "High";
  }

  return "Needs qualification";
}

export function rankLead(lead: Omit<LeadRecord, "score"> | LeadRecord) {
  let score = 40;

  if (lead.aiIntent === "High") score += 30;
  if (lead.aiIntent === "Medium") score += 18;
  if (lead.reviewCount && lead.reviewCount >= 100) score += 14;
  if (lead.rating && lead.rating >= 4.5) score += 12;
  if (lead.size === "mid-market") score += 10;
  if (lead.size === "local") score += 6;
  if (lead.website) score += 6;
  if (lead.phone) score += 8;

  return Math.min(100, score);
}

export function isWeakWebsiteCandidate(lead: Pick<LeadRecord, "website">) {
  if (!lead.website) return true;

  try {
    const host = new URL(lead.website).hostname.toLowerCase();
    return [
      "business.site",
      "facebook.com",
      "instagram.com",
      "godaddysites.com",
      "wixsite.com",
      "weebly.com",
      "sites.google.com",
    ].some((weakHost) => host === weakHost || host.endsWith(`.${weakHost}`));
  } catch {
    return false;
  }
}

export function leadMatchesSearchFilters(lead: LeadRecord, input: LeadSearchInput) {
  if (input.onlyWithoutWebsite && lead.website) return false;
  if (input.hasPhoneOnly && !lead.phone) return false;
  if (input.minRating && (!lead.rating || lead.rating < input.minRating)) return false;
  if (input.minReviews && (!lead.reviewCount || lead.reviewCount < input.minReviews)) return false;
  if (input.weakWebsiteCandidate && !isWeakWebsiteCandidate(lead)) return false;
  return true;
}

export function mapGooglePlaceToLead(
  place: GooglePlace,
  context: Pick<LeadSearchInput, "niche" | "location">
): LeadRecord {
  const niche = cleanPart(context.niche) || "AI automation";
  const leadWithoutScore: Omit<LeadRecord, "score"> = {
    id: `google:${place.place_id || cleanPart(place.name).toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unknown"}`,
    company: place.name || "Unknown business",
    source: "google_places",
    location: place.formatted_address || context.location,
    niche,
    size: inferSize(place),
    aiIntent: inferIntent(place),
    evidence: [
      place.rating
        ? `${place.rating} stars from ${place.user_ratings_total || 0} Google reviews`
        : "Google Places match",
      place.business_status ? `Status: ${place.business_status}` : "Business status unavailable",
      place.types?.length ? `Categories: ${place.types.slice(0, 4).join(", ")}` : "Categories unavailable",
    ],
    rating: place.rating,
    reviewCount: place.user_ratings_total,
    website: place.website,
  };

  return {
    ...leadWithoutScore,
    score: rankLead(leadWithoutScore),
  };
}

export function enrichLeadWithPlaceDetails(
  lead: LeadRecord,
  details: GooglePlaceDetails
): LeadRecord {
  const enriched = {
    ...lead,
    phone: details.international_phone_number || details.formatted_phone_number || lead.phone,
    localPhone: details.formatted_phone_number || lead.localPhone,
    website: details.website || lead.website,
  };
  return { ...enriched, score: rankLead(enriched) };
}

export function normalizeLeadSearchInput(input: Partial<LeadSearchInput>): LeadSearchInput {
  return {
    business: cleanPart(input.business) || "businesses",
    location: cleanPart(input.location) || "local",
    distanceMiles: Math.max(1, Math.min(100, Number(input.distanceMiles) || 15)),
    niche: cleanPart(input.niche) || "AI automation",
    onlyWithoutWebsite: Boolean(input.onlyWithoutWebsite),
    hasPhoneOnly: Boolean(input.hasPhoneOnly),
    minRating: Math.max(0, Math.min(5, Number(input.minRating) || 0)),
    minReviews: Math.max(0, Math.min(10000, Math.round(Number(input.minReviews) || 0))),
    weakWebsiteCandidate: Boolean(input.weakWebsiteCandidate),
  };
}
