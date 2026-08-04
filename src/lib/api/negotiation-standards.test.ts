import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  StandardApiError,
  archiveNegotiationStandard,
  createNegotiationStandard,
  deleteNegotiationStandard,
  fetchNegotiationStandard,
  fetchNegotiationStandardVersion,
  fetchNegotiationStandardVersions,
  publishNegotiationStandard,
  updateNegotiationStandard,
  validateNegotiationStandard,
} from "./negotiation-standards";

const server = setupServer();
const campaignId = "campaign-1";
const token = "test-token";
const content = { schema_version: 1, overall_passing_score: 70, blocks: [] };
const standard = {
  id: "standard-1",
  campaign_id: campaignId,
  name: "Default",
  description: null,
  status: "draft" as const,
  revision: 1,
  draft_content: content,
  current_version_id: null,
  current_version_number: null,
};
const version = {
  id: "version-1",
  standard_id: "standard-1",
  version_number: 1,
  schema_version: 1,
  snapshot: content,
  content_hash: "hash",
  created_by: "admin-1",
  published_by: "admin-1",
  created_at: "2026-01-01T00:00:00Z",
  published_at: "2026-01-01T00:00:00Z",
  publication_note: null,
};

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());


describe("negotiation standards API", () => {
  it("calls every lifecycle endpoint with the bearer token", async () => {
    const requests: string[] = [];
    const authHeaders: string[] = [];
    const capture = ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      requests.push(`${request.method} ${url.pathname}${url.search}`);
      authHeaders.push(request.headers.get("authorization") ?? "");
    };
    server.use(
      http.all("*/api/campaigns/:campaignId/negotiation-standard", ({ request }) => { capture({ request }); return HttpResponse.json(standard); }),
      http.post("*/api/campaigns/:campaignId/negotiation-standard/validate", ({ request }) => { capture({ request }); return HttpResponse.json({ valid: true, weight_total: 100, errors: [] }); }),
      http.post("*/api/campaigns/:campaignId/negotiation-standard/publish", ({ request }) => { capture({ request }); return HttpResponse.json(version); }),
      http.post("*/api/campaigns/:campaignId/negotiation-standard/archive", ({ request }) => { capture({ request }); return HttpResponse.json(standard); }),
      http.get("*/api/campaigns/:campaignId/negotiation-standard/versions", ({ request }) => { capture({ request }); return HttpResponse.json({ items: [version], page: 1, page_size: 20, total: 1 }); }),
      http.get("*/api/campaigns/:campaignId/negotiation-standard/versions/:versionId", ({ request }) => { capture({ request }); return HttpResponse.json(version); }),
      http.delete("*/api/campaigns/:campaignId/negotiation-standard", ({ request }) => { capture({ request }); return new HttpResponse(null, { status: 204 }); }),
    );

    await fetchNegotiationStandard(campaignId, token);
    await createNegotiationStandard(campaignId, { name: "Default", draft_content: content }, token);
    await updateNegotiationStandard(campaignId, { expected_revision: 1, draft_content: content }, token);
    await deleteNegotiationStandard(campaignId, token);
    await validateNegotiationStandard(campaignId, token);
    await publishNegotiationStandard(campaignId, {}, token);
    await archiveNegotiationStandard(campaignId, token);
    await fetchNegotiationStandardVersions(campaignId, token);
    await fetchNegotiationStandardVersion(campaignId, "version-1", token);

    expect(requests).toEqual(expect.arrayContaining([
      "GET /api/campaigns/campaign-1/negotiation-standard",
      "POST /api/campaigns/campaign-1/negotiation-standard",
      "PUT /api/campaigns/campaign-1/negotiation-standard",
      "DELETE /api/campaigns/campaign-1/negotiation-standard",
      "POST /api/campaigns/campaign-1/negotiation-standard/validate",
      "POST /api/campaigns/campaign-1/negotiation-standard/publish",
      "POST /api/campaigns/campaign-1/negotiation-standard/archive",
      "GET /api/campaigns/campaign-1/negotiation-standard/versions?page=1&page_size=20",
      "GET /api/campaigns/campaign-1/negotiation-standard/versions/version-1",
    ]));
    expect(authHeaders).toHaveLength(9);
    expect(authHeaders.every((header) => header === `Bearer ${token}`)).toBe(true);
  });

  it("retains structured details for forbidden, conflict, and validation errors", async () => {
    const cases = [
      { status: 403, detail: { code: "admin_required", message: "Administrator access required" } },
      { status: 409, detail: { code: "stale_revision", message: "Revision is stale" } },
      { status: 422, detail: { code: "invalid_standard", message: "Standard is invalid", weight_total: 90, errors: [{ code: "weight_total", path: "blocks", message: "Weights must total 100" }] } },
    ];

    for (const item of cases) {
      server.use(http.get("*/api/campaigns/:campaignId/negotiation-standard", () => HttpResponse.json({ detail: item.detail }, { status: item.status })));
      const error = await fetchNegotiationStandard(campaignId, token).catch((value: unknown) => value);
      expect(error).toBeInstanceOf(StandardApiError);
      expect(error).toMatchObject({ status: item.status, detail: item.detail });
    }
  });
});
