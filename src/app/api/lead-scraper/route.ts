import { NextResponse } from "next/server";
import {
  buildAiIntentQueries,
  buildLeadSourceLinks,
  buildPlaceDetailsUrl,
  buildPlacesTextSearchUrl,
  enrichLeadWithPlaceDetails,
  leadMatchesSearchFilters,
  mapGooglePlaceToLead,
  normalizeLeadSearchInput,
  type GooglePlaceDetails,
  type LeadRecord,
} from "../../../lib/leadScraper";

export const dynamic = "force-dynamic";

type GooglePlacesResponse = {
  results?: Array<{ place_id?: string }>;
  error_message?: string;
  status?: string;
};

type GooglePlaceDetailsResponse = {
  result?: GooglePlaceDetails;
  error_message?: string;
  status?: string;
};

async function fetchPlaceDetails(placeId: string, apiKey: string) {
  const response = await fetch(buildPlaceDetailsUrl(placeId, apiKey), {
    cache: "no-store",
  });
  const data = (await response.json()) as GooglePlaceDetailsResponse;

  if (!response.ok || data.error_message) {
    return undefined;
  }

  return data.result;
}

async function fetchGooglePlacesLeads(input: ReturnType<typeof normalizeLeadSearchInput>) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return {
      leads: [] as LeadRecord[],
      warnings: [
        "GOOGLE_PLACES_API_KEY is not configured, so only source discovery links were generated.",
      ],
      googlePlacesConfigured: false,
    };
  }

  const response = await fetch(buildPlacesTextSearchUrl({ ...input, apiKey }), {
    cache: "no-store",
  });
  const data = (await response.json()) as GooglePlacesResponse;

  if (!response.ok || data.error_message) {
    return {
      leads: [] as LeadRecord[],
      warnings: [data.error_message || "Google Places search failed."],
      googlePlacesConfigured: true,
    };
  }

  const enrichedLeads = await Promise.all(
    (data.results || []).slice(0, 12).map(async (place) => {
      const baseLead = mapGooglePlaceToLead(place, input);
      if (!place.place_id) {
        return baseLead;
      }

      const details = await fetchPlaceDetails(place.place_id, apiKey);
      return details ? enrichLeadWithPlaceDetails(baseLead, details) : baseLead;
    })
  );

  const leads = enrichedLeads.filter((lead) => leadMatchesSearchFilters(lead, input));

  return {
    leads: leads.sort((a, b) => b.score - a.score),
    warnings: data.status && data.status !== "OK" ? [`Google Places status: ${data.status}`] : [],
    googlePlacesConfigured: true,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const input = normalizeLeadSearchInput(body);
    const places = await fetchGooglePlacesLeads(input);

    return NextResponse.json({
      ok: true,
      input,
      setup: {
        googlePlacesConfigured: places.googlePlacesConfigured,
      },
      queries: buildAiIntentQueries(input),
      sourceLinks: buildLeadSourceLinks(input),
      leads: places.leads,
      warnings: places.warnings,
      complianceNote:
        "LinkedIn, Facebook, Reddit, and Indeed are provided as compliant discovery links. Avoid credentialed or ToS-bypassing scraping; connect approved APIs or manual review workflows for those sources. Phone numbers are enriched through Google Place Details when available.",
    });
  } catch (error) {
    console.error("Lead scraper API failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Lead scraper failed",
      },
      { status: 500 }
    );
  }
}
