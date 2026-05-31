import { describe, expect, it } from "vitest";

import {
  buildAiIntentQueries,
  buildLeadSourceLinks,
  buildPlaceDetailsUrl,
  buildPlacesTextSearchUrl,
  enrichLeadWithPlaceDetails,
  isWeakWebsiteCandidate,
  leadMatchesSearchFilters,
  mapGooglePlaceToLead,
  normalizeLeadSearchInput,
  rankLead,
} from "../src/lib/leadScraper";

describe("lead scraper helpers", () => {
  it("normalizes advanced lead search filters", () => {
    expect(normalizeLeadSearchInput({ business: "clinics", location: "Austin" })).toMatchObject({
      onlyWithoutWebsite: false,
      hasPhoneOnly: false,
      minRating: 0,
      minReviews: 0,
      weakWebsiteCandidate: false,
    });
    expect(
      normalizeLeadSearchInput({
        business: "clinics",
        location: "Austin",
        onlyWithoutWebsite: true,
        hasPhoneOnly: true,
        minRating: 4.7,
        minReviews: 50.6,
        weakWebsiteCandidate: true,
      })
    ).toMatchObject({
      onlyWithoutWebsite: true,
      hasPhoneOnly: true,
      minRating: 4.7,
      minReviews: 51,
      weakWebsiteCandidate: true,
    });
  });

  it("builds reusable AI-intent search queries for local business discovery", () => {
    expect(
      buildAiIntentQueries({
        business: "dentists",
        location: "Austin, TX",
        niche: "healthcare automation",
      })
    ).toEqual([
      "dentists Austin, TX healthcare automation AI automation",
      "dentists Austin, TX hiring AI automation",
      "dentists Austin, TX looking for AI integration",
      "dentists Austin, TX ChatGPT automation",
      "dentists Austin, TX workflow automation",
    ]);
  });

  it("creates compliant discovery links for social/job platforms without embedding private tokens", () => {
    const links = buildLeadSourceLinks({
      business: "law firms",
      location: "Denver",
      niche: "intake automation",
    });

    expect(links.map((link) => link.source)).toEqual([
      "linkedin",
      "facebook",
      "reddit",
      "indeed",
    ]);
    expect(links[0].url).toContain("site%3Alinkedin.com%2Fcompany");
    expect(links[2].url).toContain("reddit.com%2Fsearch");
    expect(links[3].url).toContain("indeed.com");
    expect(JSON.stringify(links)).not.toContain("GOOGLE_PLACES_API_KEY");
  });

  it("builds Google Places Text Search URLs from location, distance, and niche inputs", () => {
    const url = buildPlacesTextSearchUrl({
      business: "restaurants",
      location: "Nashville, TN",
      distanceMiles: 25,
      niche: "phone ordering AI",
      apiKey: "test-key",
    });

    expect(url).toContain("https://maps.googleapis.com/maps/api/place/textsearch/json");
    expect(url).toContain("query=restaurants+phone+ordering+AI+in+Nashville%2C+TN");
    expect(url).toContain("radius=40234");
    expect(url).toContain("key=test-key");
  });

  it("builds Google Place Details URLs for phone and website enrichment", () => {
    const url = buildPlaceDetailsUrl("abc123", "test-key");

    expect(url).toContain("https://maps.googleapis.com/maps/api/place/details/json");
    expect(url).toContain("place_id=abc123");
    expect(url).toContain("fields=formatted_phone_number%2Cinternational_phone_number%2Cwebsite");
    expect(url).toContain("key=test-key");
  });

  it("maps Google Places results into ranked lead records", () => {
    const lead = mapGooglePlaceToLead(
      {
        place_id: "abc123",
        name: "Nashville Dental Studio",
        formatted_address: "1 Main St, Nashville, TN",
        business_status: "OPERATIONAL",
        rating: 4.8,
        user_ratings_total: 220,
        types: ["dentist", "health", "point_of_interest"],
      },
      { niche: "intake automation", location: "Nashville, TN" }
    );

    expect(lead).toMatchObject({
      id: "google:abc123",
      company: "Nashville Dental Studio",
      source: "google_places",
      location: "1 Main St, Nashville, TN",
      niche: "intake automation",
      size: "local",
      aiIntent: "Needs qualification",
    });
    expect(lead.evidence[0]).toContain("4.8 stars");
    expect(rankLead(lead)).toBeGreaterThanOrEqual(70);
  });

  it("enriches Google Places leads with phone numbers from Place Details", () => {
    const lead = mapGooglePlaceToLead(
      {
        place_id: "abc123",
        name: "Nashville Dental Studio",
        formatted_address: "1 Main St, Nashville, TN",
      },
      { niche: "intake automation", location: "Nashville, TN" }
    );

    expect(
      enrichLeadWithPlaceDetails(lead, {
        formatted_phone_number: "(615) 555-0199",
        international_phone_number: "+1 615-555-0199",
        website: "https://nashvilledental.example.com",
      })
    ).toMatchObject({
      phone: "+1 615-555-0199",
      localPhone: "(615) 555-0199",
      website: "https://nashvilledental.example.com",
    });
  });

  it("matches leads against advanced filters after enrichment", () => {
    const baseLead = mapGooglePlaceToLead(
      {
        place_id: "abc123",
        name: "Austin HVAC Pros",
        formatted_address: "1 Main St, Austin, TX",
        rating: 4.6,
        user_ratings_total: 120,
      },
      { niche: "missed-call automation", location: "Austin, TX" }
    );
    const enrichedLead = enrichLeadWithPlaceDetails(baseLead, {
      formatted_phone_number: "(512) 555-0101",
      website: "https://austin-hvac.business.site",
    });

    expect(
      leadMatchesSearchFilters(enrichedLead, {
        business: "HVAC",
        location: "Austin",
        hasPhoneOnly: true,
        minRating: 4.5,
        minReviews: 100,
        weakWebsiteCandidate: true,
      })
    ).toBe(true);
    expect(isWeakWebsiteCandidate(enrichedLead)).toBe(true);
    expect(
      leadMatchesSearchFilters(enrichedLead, {
        business: "HVAC",
        location: "Austin",
        onlyWithoutWebsite: true,
      })
    ).toBe(false);
  });
});
