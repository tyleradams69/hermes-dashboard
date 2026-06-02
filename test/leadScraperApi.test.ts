import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { POST as leadScraperPost } from "../src/app/api/lead-scraper/route";

function request(body: unknown) {
  return new Request("https://dashboard.example.com/api/lead-scraper", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("lead scraper API", () => {
  beforeEach(() => {
    delete process.env.GOOGLE_PLACES_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns source links and a setup warning when Google Places is not configured", async () => {
    const response = await leadScraperPost(
      request({ business: "dentists", location: "Austin", niche: "intake AI" })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.setup.googlePlacesConfigured).toBe(false);
    expect(data.sourceLinks).toHaveLength(4);
    expect(data.leads).toEqual([]);
    expect(data.warnings[0]).toContain("GOOGLE_PLACES_API_KEY");
  });

  it("maps Google Places results without returning the private API key", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "server-only-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                place_id: "place-1",
                name: "Austin Automation Clinic",
                formatted_address: "10 Congress Ave, Austin, TX",
                business_status: "OPERATIONAL",
                rating: 4.9,
                user_ratings_total: 145,
                types: ["health", "point_of_interest"],
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const response = await leadScraperPost(
      request({ business: "clinics", location: "Austin", distanceMiles: 10, niche: "automation" })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.leads[0]).toMatchObject({
      id: "google:place-1",
      company: "Austin Automation Clinic",
      source: "google_places",
      aiIntent: "High",
    });
    expect(JSON.stringify(data)).not.toContain("server-only-key");
  });

  it("can filter nationwide Google Places results to businesses without a website attached", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "server-only-key";
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("/place/details/")) {
        const placeId = new URL(href).searchParams.get("place_id");
        return new Response(
          JSON.stringify({
            result: placeId === "place-with-site" ? { website: "https://has-site.example.com" } : {},
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          results: [
            {
              place_id: "place-with-site",
              name: "Business With Website",
              formatted_address: "10 Congress Ave, Austin, TX",
              rating: 4.9,
              user_ratings_total: 145,
            },
            {
              place_id: "place-without-site",
              name: "Business Without Website",
              formatted_address: "20 Congress Ave, Austin, TX",
              rating: 4.7,
              user_ratings_total: 90,
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await leadScraperPost(
      request({
        business: "",
        location: "",
        distanceMiles: 10,
        niche: "",
        onlyWithoutWebsite: true,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.input).toMatchObject({
      business: "businesses",
      location: "United States",
      niche: "",
      onlyWithoutWebsite: true,
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("query=businesses+in+United+States");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("radius=");
    expect(data.queries[0]).toBe("businesses United States business without website");
    expect(data.leads).toHaveLength(1);
    expect(data.leads[0]).toMatchObject({ company: "Business Without Website" });
    expect(data.leads[0].website).toBeUndefined();
  });

  it("applies phone, rating, review, and weak-website filters after Place Details enrichment", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "server-only-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string | URL | Request) => {
        const href = String(url);
        if (href.includes("/place/details/")) {
          const placeId = new URL(href).searchParams.get("place_id");
          return new Response(
            JSON.stringify({
              result:
                placeId === "good-fit"
                  ? { formatted_phone_number: "(512) 555-0101", website: "https://goodfit.business.site" }
                  : { website: "https://polished.example.com" },
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            results: [
              {
                place_id: "good-fit",
                name: "Good Fit HVAC",
                formatted_address: "10 Congress Ave, Austin, TX",
                rating: 4.8,
                user_ratings_total: 180,
              },
              {
                place_id: "too-polished",
                name: "Too Polished HVAC",
                formatted_address: "20 Congress Ave, Austin, TX",
                rating: 4.9,
                user_ratings_total: 220,
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      })
    );

    const response = await leadScraperPost(
      request({
        business: "HVAC",
        location: "Austin",
        hasPhoneOnly: true,
        minRating: 4.5,
        minReviews: 100,
        weakWebsiteCandidate: true,
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.input).toMatchObject({
      hasPhoneOnly: true,
      minRating: 4.5,
      minReviews: 100,
      weakWebsiteCandidate: true,
    });
    expect(data.leads).toHaveLength(1);
    expect(data.leads[0]).toMatchObject({ company: "Good Fit HVAC", phone: "(512) 555-0101" });
  });
});
