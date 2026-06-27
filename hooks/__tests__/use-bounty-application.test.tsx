import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  ApplicationError,
  useApplyForSlot,
  useApplyToBounty,
  useApproveApplicationSubmission,
  useDeclineApplicant,
  useRaiseDispute,
  useReleasePayment,
  useRemoveContributor,
  useRequestRevisions,
  useSelectApplicant,
} from "../use-bounty-application";
import { bountyKeys } from "@/lib/query/query-keys";
import { escrowKeys } from "../use-escrow";
import { authClient } from "@/lib/auth-client";
import { fetcher } from "@/lib/graphql/client";
import { post } from "@/lib/api/client";
import { EscrowService } from "@/lib/services/escrow";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: jest.fn(),
  },
}));

jest.mock("@/lib/graphql/client", () => ({
  fetcher: jest.fn(),
}));

jest.mock("@/lib/api/client", () => ({
  post: jest.fn(),
}));

jest.mock("@/lib/services/escrow", () => ({
  EscrowService: {
    releasePayment: jest.fn(),
  },
}));

type Harness = {
  queryClient: QueryClient;
  wrapper: ({ children }: { children: ReactNode }) => JSX.Element;
};

const bountyId = "123";
const applicantAddress = "GAPPLICANT";
const creatorAddress = "GCREATOR";
const originalBounty = {
  bounty: {
    id: bountyId,
    status: "OPEN",
    updatedAt: "2025-01-01T00:00:00.000Z",
    rewardAmount: 100,
    milestones: [
      { id: "m1", title: "M1" },
      { id: "m2", title: "M2" },
    ],
    totalSlotsOccupied: 1,
    contributorProgress: [
      { userId: "user-1", userName: "Existing", currentMilestoneId: "m1" },
    ],
    applications: [
      { id: "app-1", applicantAddress, status: "PENDING" },
      { id: "app-2", applicantAddress: "GOTHER", status: "PENDING" },
    ],
  },
};

function createHarness(): Harness {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

function seedBounty(queryClient: QueryClient, value = originalBounty) {
  queryClient.setQueryData(
    bountyKeys.detail(bountyId),
    JSON.parse(JSON.stringify(value)),
  );
}

function installApplicationContracts(
  overrides: Partial<Record<string, jest.Mock>> = {},
) {
  const contracts = {
    apply: jest.fn().mockResolvedValue({ txHash: "tx-apply" }),
    selectApplicant: jest.fn().mockResolvedValue({ txHash: "tx-select" }),
    submitWork: jest.fn().mockResolvedValue({ txHash: "tx-submit" }),
    approveSubmission: jest.fn().mockResolvedValue({ txHash: "tx-approve" }),
    applyForSlot: jest.fn().mockResolvedValue({ txHash: "tx-slot" }),
    ...overrides,
  };
  (
    globalThis as typeof globalThis & {
      __applicationContracts?: typeof contracts;
    }
  ).__applicationContracts = contracts;
  return contracts;
}

describe("bounty application mutation hooks", () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    installApplicationContracts();
    (authClient.useSession as jest.Mock).mockReturnValue({
      data: {
        user: { id: "user-2", name: "New Contributor", image: "avatar.png" },
      },
    });
    (fetcher as jest.Mock).mockReturnValue(
      jest.fn().mockResolvedValue({ reviewSubmission: { id: "submission-1" } }),
    );
    (post as jest.Mock).mockResolvedValue({
      id: "dispute-1",
      campaignId: bountyId,
      status: "OPEN",
    });
    (EscrowService.releasePayment as jest.Mock).mockResolvedValue({
      poolId: bountyId,
    });
  });

  afterEach(() => {
    delete (globalThis as { __applicationContracts?: unknown })
      .__applicationContracts;
    jest.useRealTimers();
  });

  it("useApplyToBounty calls the application contract", async () => {
    const { wrapper } = createHarness();
    const contracts = installApplicationContracts();
    const { result } = renderHook(() => useApplyToBounty(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        bountyId,
        applicantAddress,
        proposal: "I can do it",
      });
    });

    expect(contracts.apply).toHaveBeenCalledWith({
      applicant: applicantAddress,
      bountyId: 123n,
      proposal: "I can do it",
    });
  });

  it("useApplyToBounty rolls back/no-ops cached bounty data when the contract fails", async () => {
    const { queryClient, wrapper } = createHarness();
    seedBounty(queryClient);
    installApplicationContracts({
      apply: jest.fn().mockRejectedValue(new Error("contract failed")),
    });
    const { result } = renderHook(() => useApplyToBounty(), { wrapper });

    await expect(
      result.current.mutateAsync({
        bountyId,
        applicantAddress,
        proposal: "I can do it",
      }),
    ).rejects.toThrow("contract failed");
    expect(queryClient.getQueryData(bountyKeys.detail(bountyId))).toEqual(
      originalBounty,
    );
  });

  it("useApplyToBounty throws when the wallet address is missing", async () => {
    const { wrapper } = createHarness();
    const contracts = installApplicationContracts();
    const { result } = renderHook(() => useApplyToBounty(), { wrapper });

    await expect(
      result.current.mutateAsync({
        bountyId,
        applicantAddress: "",
        proposal: "I can do it",
      }),
    ).rejects.toThrow(ApplicationError);
    expect(contracts.apply).not.toHaveBeenCalled();
  });

  it.each([
    [
      "useSelectApplicant",
      () => useSelectApplicant(),
      { bountyId, creatorAddress, applicantAddress },
      "IN_PROGRESS",
      { selectApplicant: jest.fn().mockResolvedValue({ txHash: "tx" }) },
    ],
    [
      "useApproveApplicationSubmission",
      () => useApproveApplicationSubmission(),
      { bountyId, creatorAddress, points: 10 },
      "COMPLETED",
      { approveSubmission: jest.fn().mockResolvedValue({ txHash: "tx" }) },
    ],
  ])(
    "%s optimistically updates status and rolls back on error",
    async (_name, useHook, variables, status, successOverride) => {
      const { queryClient, wrapper } = createHarness();
      seedBounty(queryClient);
      installApplicationContracts(
        successOverride as Partial<Record<string, jest.Mock>>,
      );
      const { result } = renderHook(
        useHook as () => ReturnType<typeof useSelectApplicant>,
        { wrapper },
      );

      await act(async () => {
        await result.current.mutateAsync(variables as never);
      });
      expect(
        (
          queryClient.getQueryData(
            bountyKeys.detail(bountyId),
          ) as typeof originalBounty
        ).bounty.status,
      ).toBe(status);

      seedBounty(queryClient);
      installApplicationContracts(
        Object.fromEntries(
          Object.keys(successOverride as object).map((key) => [
            key,
            jest.fn().mockRejectedValue(new Error("contract failed")),
          ]),
        ),
      );
      const { result: errorResult } = renderHook(
        useHook as () => ReturnType<typeof useSelectApplicant>,
        { wrapper },
      );
      await expect(
        errorResult.current.mutateAsync(variables as never),
      ).rejects.toThrow("contract failed");
      expect(queryClient.getQueryData(bountyKeys.detail(bountyId))).toEqual(
        originalBounty,
      );
    },
  );

  it("useRequestRevisions updates to UNDER_REVIEW and rolls back on GraphQL error", async () => {
    const { queryClient, wrapper } = createHarness();
    seedBounty(queryClient);
    const { result } = renderHook(() => useRequestRevisions(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        bountyId,
        submissionId: "submission-1",
        feedback: "Fix it",
      });
    });
    expect(
      (
        queryClient.getQueryData(
          bountyKeys.detail(bountyId),
        ) as typeof originalBounty
      ).bounty.status,
    ).toBe("UNDER_REVIEW");

    seedBounty(queryClient);
    (fetcher as jest.Mock).mockReturnValue(
      jest.fn().mockRejectedValue(new Error("graphql failed")),
    );
    const { result: errorResult } = renderHook(() => useRequestRevisions(), {
      wrapper,
    });
    await expect(
      errorResult.current.mutateAsync({
        bountyId,
        submissionId: "submission-1",
        feedback: "Fix it",
      }),
    ).rejects.toThrow("graphql failed");
    expect(queryClient.getQueryData(bountyKeys.detail(bountyId))).toEqual(
      originalBounty,
    );
  });

  it("useApplyForSlot increments slot count, adds contributor progress, and rolls back on error", async () => {
    const { queryClient, wrapper } = createHarness();
    seedBounty(queryClient);
    const { result } = renderHook(() => useApplyForSlot(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ bountyId, applicantAddress });
    });
    const data = queryClient.getQueryData(
      bountyKeys.detail(bountyId),
    ) as typeof originalBounty;
    expect(data.bounty.totalSlotsOccupied).toBe(2);
    expect(data.bounty.contributorProgress).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: "user-2" })]),
    );

    seedBounty(queryClient);
    installApplicationContracts({
      applyForSlot: jest.fn().mockRejectedValue(new Error("contract failed")),
    });
    const { result: errorResult } = renderHook(() => useApplyForSlot(), {
      wrapper,
    });
    await expect(
      errorResult.current.mutateAsync({ bountyId, applicantAddress }),
    ).rejects.toThrow("contract failed");
    expect(queryClient.getQueryData(bountyKeys.detail(bountyId))).toEqual(
      originalBounty,
    );
  });

  it("useReleasePayment increments the escrow released amount and rolls back on error", async () => {
    const { queryClient, wrapper } = createHarness();
    seedBounty(queryClient);
    const pool = {
      poolId: bountyId,
      totalAmount: 100,
      releasedAmount: 20,
      status: "Escrowed",
      asset: "USDC",
      isLocked: true,
      expiry: null,
    };
    queryClient.setQueryData(escrowKeys.pool(bountyId), pool);
    const { result } = renderHook(() => useReleasePayment(bountyId), {
      wrapper,
    });
    await act(async () => {
      await result.current.mutateAsync({
        contributorId: "user-1",
        milestoneId: "m1",
      });
    });
    expect(queryClient.getQueryData(escrowKeys.pool(bountyId))).toEqual(
      expect.objectContaining({
        releasedAmount: 70,
        status: "Partially Released",
      }),
    );

    queryClient.setQueryData(escrowKeys.pool(bountyId), pool);
    (EscrowService.releasePayment as jest.Mock).mockRejectedValue(
      new Error("escrow failed"),
    );
    const { result: errorResult } = renderHook(
      () => useReleasePayment(bountyId),
      { wrapper },
    );
    await expect(
      errorResult.current.mutateAsync({
        contributorId: "user-1",
        milestoneId: "m1",
      }),
    ).rejects.toThrow("escrow failed");
    expect(queryClient.getQueryData(escrowKeys.pool(bountyId))).toEqual(pool);
  });

  it("useRemoveContributor removes progress and decrements totalSlotsOccupied", async () => {
    jest.useFakeTimers();
    const { queryClient, wrapper } = createHarness();
    seedBounty(queryClient);
    const { result } = renderHook(() => useRemoveContributor(bountyId), {
      wrapper,
    });
    const promise = result.current.mutateAsync({ contributorId: "user-1" });
    await waitFor(() =>
      expect(
        (
          queryClient.getQueryData(
            bountyKeys.detail(bountyId),
          ) as typeof originalBounty
        ).bounty.totalSlotsOccupied,
      ).toBe(0),
    );
    expect(
      (
        queryClient.getQueryData(
          bountyKeys.detail(bountyId),
        ) as typeof originalBounty
      ).bounty.contributorProgress,
    ).toEqual([]);
    act(() => jest.advanceTimersByTime(1000));
    await act(async () => {
      await promise;
    });
  });

  it("useDeclineApplicant removes the applicant and rolls back on error", async () => {
    const { queryClient, wrapper } = createHarness();
    seedBounty(queryClient);
    const { result } = renderHook(() => useDeclineApplicant(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        bountyId,
        applicantAddress,
        reason: "No fit",
      });
    });
    expect(
      (
        queryClient.getQueryData(
          bountyKeys.detail(bountyId),
        ) as typeof originalBounty
      ).bounty.applications,
    ).toEqual([{ id: "app-2", applicantAddress: "GOTHER", status: "PENDING" }]);

    seedBounty(queryClient);
    installApplicationContracts({
      declineApplicant: jest
        .fn()
        .mockRejectedValue(new Error("contract failed")),
    });
    const { result: errorResult } = renderHook(() => useDeclineApplicant(), {
      wrapper,
    });
    await expect(
      errorResult.current.mutateAsync({
        bountyId,
        applicantAddress,
        reason: "No fit",
      }),
    ).rejects.toThrow("contract failed");
    expect(queryClient.getQueryData(bountyKeys.detail(bountyId))).toEqual(
      originalBounty,
    );
  });

  it("useRaiseDispute posts to /api/disputes and invalidates bounty queries", async () => {
    const { queryClient, wrapper } = createHarness();
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRaiseDispute(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        bountyId,
        reason: "OTHER",
        description: "Need mediation",
      });
    });
    expect(post).toHaveBeenCalledWith("/api/disputes", {
      campaignId: bountyId,
      reason: "OTHER",
      description: "Need mediation",
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: bountyKeys.detail(bountyId),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: bountyKeys.lists(),
    });
  });

  it("useRaiseDispute does not invalidate bounty queries when the POST fails", async () => {
    const { queryClient, wrapper } = createHarness();
    (post as jest.Mock).mockRejectedValue(new Error("network failed"));
    const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRaiseDispute(), { wrapper });
    await expect(
      result.current.mutateAsync({
        bountyId,
        reason: "OTHER",
        description: "Need mediation",
      }),
    ).rejects.toThrow("network failed");
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
