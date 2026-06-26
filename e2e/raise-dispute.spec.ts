/**
 * E2E: Raise Dispute Flow
 *
 * Covers the full Raise Dispute journey on a bounty detail page:
 *   1. Eligible user sees an active Raise Dispute button
 *   2. Clicking it opens the AlertDialog with reason Select and description Textarea
 *   3. Submitting with empty fields keeps dialog open and shows inline validation
 *   4. Valid submission closes dialog, shows success toast, redirects to /dispute/:id
 *   5. API 500 keeps dialog open and shows error toast
 *
 * Stability strategy:
 *   - GraphQL intercepted via page.route() – hermetic, no live backend.
 *   - POST /api/disputes mocked via page.route().
 *   - Reuses MOCK_SESSION and setupMocks pattern from bounty-application.spec.ts.
 *   - Selectors use roles/labels/visible text only.
 *   - Timing via await expect(...) – no arbitrary sleeps.
 */

import { test, expect, type Page } from "@playwright/test";

const BOUNTY_ID = "e2ec0bcd-dead-beef-cafe-ab01cd02ef06";
const CREATOR_ID = "user-dispute-creator";
const CONTRIBUTOR_ID = "user-dispute-contributor";
const NEW_DISPUTE_ID = "dispute-abc-123";
const WALLET_ADDRESS =
  "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGYWDOUALPIF5JD4PI21JQ";

// Bounty in IN_PROGRESS with one submission by the contributor
const MOCK_BOUNTY = {
  __typename: "Bounty",
  id: BOUNTY_ID,
  title: "Implement ZKP Dispute Test Bounty",
  description: "A bounty used for dispute e2e tests.",
  status: "IN_PROGRESS",
  type: "MILESTONE_BASED",
  rewardAmount: 500,
  rewardCurrency: "XLM",
  createdAt: "2025-01-10T09:00:00Z",
  updatedAt: "2025-01-24T14:20:00Z",
  organizationId: "org-test",
  projectId: null,
  bountyWindowId: null,
  githubIssueUrl: "https://github.com/test/repo/issues/99",
  githubIssueNumber: 99,
  createdBy: CREATOR_ID,
  organization: {
    __typename: "BountyOrganization",
    id: "org-test",
    name: "Test Org",
    logo: null,
    slug: "test-org",
  },
  project: null,
  bountyWindow: null,
  _count: { __typename: "BountyCount", submissions: 1 },
  submissions: [
    {
      __typename: "BountySubmissionType",
      id: "sub-dispute-001",
      bountyId: BOUNTY_ID,
      submittedBy: CONTRIBUTOR_ID,
      githubPullRequestUrl: "https://github.com/test/repo/pull/10",
      status: "PENDING",
      reviewComments: null,
      reviewedAt: null,
      reviewedBy: null,
      paidAt: null,
      rewardTransactionHash: null,
      createdAt: "2025-01-20T10:00:00Z",
      updatedAt: "2025-01-20T10:00:00Z",
      submittedByUser: {
        __typename: "BountySubmissionUser",
        id: CONTRIBUTOR_ID,
        name: "Test Contributor",
        image: null,
      },
      reviewedByUser: null,
    },
  ],
  milestones: [{ id: "m1", title: "Milestone 1", isCompleted: false }],
  contributorProgress: null,
  maxSlots: null,
  totalSlotsOccupied: null,
};

function makeMockSession(userId: string) {
  return {
    user: {
      id: userId,
      name: userId === CREATOR_ID ? "Test Creator" : "Test Contributor",
      email: `${userId}@test.com`,
      image: null,
      walletAddress: WALLET_ADDRESS,
    },
    session: { token: "fake-e2e-token" },
  };
}

async function setupMocks(
  page: Page,
  options: {
    userId: string;
    bountyData?: typeof MOCK_BOUNTY;
    disputeHandler?: (
      route: Parameters<Parameters<Page["route"]>[1]>[0],
    ) => Promise<void>;
  },
) {
  const { userId, bountyData = MOCK_BOUNTY, disputeHandler } = options;

  await page.route("**/api/auth/**", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.pathname.endsWith("/get-session") ||
      url.pathname.endsWith("/session")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeMockSession(userId)),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{}",
      });
    }
  });

  await page.route("**/api/graphql", async (route) => {
    let body: { operationName?: string } = {};
    try {
      body = JSON.parse(route.request().postData() ?? "{}") as {
        operationName?: string;
      };
    } catch {
      /* ignore */
    }

    switch (body.operationName) {
      case "Bounty":
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { bounty: bountyData } }),
        });
        return;
      case "TopContributors":
      case "Leaderboard":
      case "GetLeaderboardUser":
      case "LeaderboardUser":
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: {} }),
        });
        return;
      default:
        await route.abort("failed");
    }
  });

  // Default: successful dispute creation
  await page.route("**/api/disputes", async (route) => {
    if (disputeHandler) {
      await disputeHandler(route);
    } else {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ id: NEW_DISPUTE_ID, campaignId: BOUNTY_ID }),
      });
    }
  });

  await page.context().addCookies([
    {
      name: "boundless_auth.session_token",
      value: "fake-e2e-token",
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function openDisputeDialog(page: Page) {
  const raiseBtn = page.getByRole("button", { name: /Raise a Dispute/i });
  await expect(raiseBtn).toBeVisible({ timeout: 10_000 });
  await expect(raiseBtn).toBeEnabled();
  await raiseBtn.click();
  await expect(page.getByRole("alertdialog")).toBeVisible({ timeout: 5_000 });
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe("Raise Dispute flow", () => {
  // ── 1. Eligible user sees the Raise Dispute button ──────────────────────

  test("creator on IN_PROGRESS bounty sees an active Raise Dispute button", async ({
    page,
  }) => {
    await setupMocks(page, { userId: CREATOR_ID });
    await page.goto(`/bounty/${BOUNTY_ID}`);
    const btn = page.getByRole("button", { name: /Raise a Dispute/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await expect(btn).toBeEnabled();
  });

  test("participant (submitter) on IN_PROGRESS bounty sees an active Raise Dispute button", async ({
    page,
  }) => {
    await setupMocks(page, { userId: CONTRIBUTOR_ID });
    await page.goto(`/bounty/${BOUNTY_ID}`);
    const btn = page.getByRole("button", { name: /Raise a Dispute/i });
    await expect(btn).toBeVisible({ timeout: 10_000 });
    await expect(btn).toBeEnabled();
  });

  // ── 2. Dialog opens with correct form elements ──────────────────────────

  test("clicking Raise Dispute opens the AlertDialog with Select and Textarea", async ({
    page,
  }) => {
    await setupMocks(page, { userId: CREATOR_ID });
    await page.goto(`/bounty/${BOUNTY_ID}`);
    await openDisputeDialog(page);

    await expect(page.getByRole("alertdialog")).toContainText(
      "Raise a Dispute",
    );
    await expect(page.getByLabel(/Reason/i)).toBeVisible();
    await expect(page.getByLabel(/Description/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Submit Dispute/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /Cancel/i })).toBeVisible();
  });

  // ── 3. Validation: empty fields keep dialog open ────────────────────────

  test("submitting with empty reason and empty description shows inline validation errors", async ({
    page,
  }) => {
    await setupMocks(page, { userId: CREATOR_ID });
    await page.goto(`/bounty/${BOUNTY_ID}`);
    await openDisputeDialog(page);

    await page.getByRole("button", { name: /Submit Dispute/i }).click();

    await expect(page.getByText(/Please select a reason/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText(/Please describe the dispute/i)).toBeVisible();
    // Dialog must stay open
    await expect(page.getByRole("alertdialog")).toBeVisible();
  });

  test("submitting with a reason but empty description keeps dialog open with description error", async ({
    page,
  }) => {
    await setupMocks(page, { userId: CREATOR_ID });
    await page.goto(`/bounty/${BOUNTY_ID}`);
    await openDisputeDialog(page);

    // Pick any reason from the Select
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();

    await page.getByRole("button", { name: /Submit Dispute/i }).click();

    await expect(page.getByText(/Please describe the dispute/i)).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole("alertdialog")).toBeVisible();
  });

  // ── 4. Successful submission ────────────────────────────────────────────

  test("valid submission closes dialog, shows success toast, and redirects to /dispute/:id", async ({
    page,
  }) => {
    await setupMocks(page, { userId: CREATOR_ID });
    await page.goto(`/bounty/${BOUNTY_ID}`);
    await openDisputeDialog(page);

    // Select a reason
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();

    // Fill description
    await page
      .getByLabel(/Description/i)
      .fill("The milestone was not delivered on time.");

    await page.getByRole("button", { name: /Submit Dispute/i }).click();

    // Dialog closes
    await expect(page.getByRole("alertdialog")).not.toBeVisible({
      timeout: 10_000,
    });

    // Success toast
    await expect(page.getByText(/Dispute filed successfully/i)).toBeVisible({
      timeout: 10_000,
    });

    // Redirect to /dispute/<id>
    await expect(page).toHaveURL(`/dispute/${NEW_DISPUTE_ID}`, {
      timeout: 10_000,
    });
  });

  // ── 5. API failure keeps dialog open and shows error toast ───────────────

  test("API 500 keeps dialog open and shows error toast", async ({ page }) => {
    await setupMocks(page, {
      userId: CREATOR_ID,
      disputeHandler: async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal Server Error" }),
        });
      },
    });
    await page.goto(`/bounty/${BOUNTY_ID}`);
    await openDisputeDialog(page);

    // Select a reason
    await page.getByRole("combobox").click();
    await page.getByRole("option").first().click();

    // Fill description
    await page
      .getByLabel(/Description/i)
      .fill("Something went wrong on your side.");

    await page.getByRole("button", { name: /Submit Dispute/i }).click();

    // Error toast
    await expect(page.getByText(/Failed to file dispute/i)).toBeVisible({
      timeout: 10_000,
    });

    // Dialog must remain open
    await expect(page.getByRole("alertdialog")).toBeVisible();
  });
});
