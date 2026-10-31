import { describe, expect, it } from "vitest";

import { isProtectedRoute, matchesRoute } from "./auth-routes";

describe("matchesRoute", () => {
  it("matches the route and its children only", () => {
    expect(matchesRoute("/settings", "/settings")).toBe(true);
    expect(matchesRoute("/settings/profile", "/settings")).toBe(true);
    expect(matchesRoute("/settingsx", "/settings")).toBe(false);
  });
});

describe("isProtectedRoute", () => {
  it("protects app pages", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/settings/billing")).toBe(true);
  });

  it("leaves public pages open", () => {
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/login")).toBe(false);
    expect(isProtectedRoute("/pricing")).toBe(false);
  });
});
