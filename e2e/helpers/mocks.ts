/**
 * Shared e2e mock helpers.
 *
 * Provides the baseline auth + GraphQL route stubs used across spec files.
 * Each spec can register additional page.route() calls *after* calling these
 * helpers to override specific operations (Playwright matches the first
 * registered handler that accepts the request).
 */

import type { Page } from "@playwright/test";

export const WALLET_ADDRESS =
  "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGYWDOUALPIF5JD4PI21JQ";

export function makeSession(
  userId: string,
  name: string,
  email: string,
): object {
  return {
    user: {
      id: userId,
      name,
      email,
      image: null,
      walletAddress: WALLET_ADDRESS,
    },
    session: { token: "fake-e2e-token" },
  };
}

/** Stub all /api/auth/** routes to return the given session object. */
export async function stubAuth(page: Page, session: object): Promise<void> {
  await page.route("**/api/auth/**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname.endsWith("/get-session") ||
      url.pathname.endsWith("/session")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    }
  });
}

/**
 * Stub /api/graphql for a specific set of operations.
 * Pass a map of operationName → response data; any unmatched operation is aborted.
 */
export async function stubGraphQL(
  page: Page,
  handlers: Record<string, unknown>,
): Promise<void> {
  await page.route("**/api/graphql", async (route) => {
    let body: { operationName?: string } = {};
    try {
      body = JSON.parse(route.request().postData() ?? "{}") as {
        operationName?: string;
      };
    } catch {
      /* ignore */
    }
    const op = body.operationName ?? "";
    if (op in handlers) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: handlers[op] }),
      });
    } else {
      await route.abort("failed");
    }
  });
}

/** Returns the hostname from BASE_URL (or 'localhost' as fallback). */
export function baseUrlHostname(): string {
  return new URL(process.env.BASE_URL ?? "http://localhost:3000").hostname;
}

/** Seed the session cookie against the correct host. */
export async function seedSessionCookie(page: Page): Promise<void> {
  await page.context().addCookies([
    {
      name: "boundless_auth.session_token",
      value: "fake-e2e-token",
      domain: baseUrlHostname(),
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

/** Null-response stubs for leaderboard operations that every detail page queries. */
export const LEADERBOARD_STUBS: Record<string, unknown> = {
  TopContributors: {},
  Leaderboard: {},
  GetLeaderboardUser: {},
  LeaderboardUser: {},
};
