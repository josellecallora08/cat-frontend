import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  getLarkAuthorizeUrl,
  larkCallback,
  getGoogleAuthorizeUrl,
  googleCallback,
} from "./auth";

// MSW server for these tests
const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Lark OAuth API", () => {
  describe("getLarkAuthorizeUrl", () => {
    it("returns authorize_url and state on success", async () => {
      server.use(
        http.get("/api/auth/lark/authorize", () => {
          return HttpResponse.json({
            authorize_url: "https://open.larksuite.com/open-apis/authen/v1/authorize?app_id=test",
            state: "random-state-token",
          });
        }),
      );

      const result = await getLarkAuthorizeUrl();

      expect(result.authorize_url).toContain("larksuite.com");
      expect(result.state).toBe("random-state-token");
    });

    it("throws error when Lark is not configured (503)", async () => {
      server.use(
        http.get("/api/auth/lark/authorize", () => {
          return HttpResponse.json(
            { detail: "Lark OAuth is not configured" },
            { status: 503 },
          );
        }),
      );

      await expect(getLarkAuthorizeUrl()).rejects.toThrow("Lark OAuth is not configured");
    });
  });

  describe("larkCallback", () => {
    it("returns token and user on successful callback", async () => {
      server.use(
        http.post("/api/auth/lark/callback", () => {
          return HttpResponse.json({
            access_token: "jwt-token-123",
            token_type: "bearer",
            user: {
              id: "user-uuid",
              email: "lark@company.com",
              full_name: "Lark User",
              role: "agent",
              is_active: true,
            },
          });
        }),
      );

      const result = await larkCallback("auth-code", "state-token");

      expect(result.access_token).toBe("jwt-token-123");
      expect(result.user.email).toBe("lark@company.com");
      expect(result.user.full_name).toBe("Lark User");
    });

    it("throws error on invalid code (401)", async () => {
      server.use(
        http.post("/api/auth/lark/callback", () => {
          return HttpResponse.json(
            { detail: "Lark authentication failed: invalid code" },
            { status: 401 },
          );
        }),
      );

      await expect(larkCallback("bad-code", "state")).rejects.toThrow(
        "Lark authentication failed",
      );
    });

    it("throws error on deactivated account (403)", async () => {
      server.use(
        http.post("/api/auth/lark/callback", () => {
          return HttpResponse.json(
            { detail: "Account is deactivated" },
            { status: 403 },
          );
        }),
      );

      await expect(larkCallback("code", "state")).rejects.toThrow("Account is deactivated");
    });
  });
});

describe("Google OAuth API", () => {
  describe("getGoogleAuthorizeUrl", () => {
    it("returns authorize_url and state on success", async () => {
      server.use(
        http.get("/api/auth/google/authorize", () => {
          return HttpResponse.json({
            authorize_url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
            state: "google-state-token",
          });
        }),
      );

      const result = await getGoogleAuthorizeUrl();

      expect(result.authorize_url).toContain("accounts.google.com");
      expect(result.state).toBe("google-state-token");
    });

    it("throws error when Google is not configured (503)", async () => {
      server.use(
        http.get("/api/auth/google/authorize", () => {
          return HttpResponse.json(
            { detail: "Google OAuth is not configured" },
            { status: 503 },
          );
        }),
      );

      await expect(getGoogleAuthorizeUrl()).rejects.toThrow("Google OAuth is not configured");
    });
  });

  describe("googleCallback", () => {
    it("returns token and user on successful callback", async () => {
      server.use(
        http.post("/api/auth/google/callback", () => {
          return HttpResponse.json({
            access_token: "jwt-token-456",
            token_type: "bearer",
            user: {
              id: "google-user-uuid",
              email: "user@gmail.com",
              full_name: "Google User",
              role: "agent",
              is_active: true,
            },
          });
        }),
      );

      const result = await googleCallback("google-auth-code", "state-token");

      expect(result.access_token).toBe("jwt-token-456");
      expect(result.user.email).toBe("user@gmail.com");
      expect(result.user.full_name).toBe("Google User");
    });

    it("throws error on invalid code (401)", async () => {
      server.use(
        http.post("/api/auth/google/callback", () => {
          return HttpResponse.json(
            { detail: "Google authentication failed: invalid_grant" },
            { status: 401 },
          );
        }),
      );

      await expect(googleCallback("bad-code", "state")).rejects.toThrow(
        "Google authentication failed",
      );
    });

    it("throws error when backend cannot reach Google (502)", async () => {
      server.use(
        http.post("/api/auth/google/callback", () => {
          return HttpResponse.json(
            { detail: "Failed to communicate with Google" },
            { status: 502 },
          );
        }),
      );

      await expect(googleCallback("code", "state")).rejects.toThrow(
        "Failed to communicate with Google",
      );
    });

    it("throws error on deactivated account (403)", async () => {
      server.use(
        http.post("/api/auth/google/callback", () => {
          return HttpResponse.json(
            { detail: "Account is deactivated" },
            { status: 403 },
          );
        }),
      );

      await expect(googleCallback("code", "state")).rejects.toThrow("Account is deactivated");
    });
  });
});
