"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { bountyKeys } from "@/lib/query/query-keys";
import { MOCK_MODEL4_MILESTONES } from "@/lib/mock/model4";
import { escrowKeys } from "./use-escrow";
import { EscrowService } from "@/lib/services/escrow";
import type { ContributorProgress, Bounty, Milestone } from "@/types/bounty";
import type { EscrowPool } from "@/types/escrow";
import {
  resolveApplicationClient,
  toBountyIdBigInt,
} from "./use-application-contracts";
import type { BountyQuery } from "@/lib/graphql/generated";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type ExtendedBountyQuery = Omit<BountyQuery, "bounty"> & {
  bounty?: BountyQuery["bounty"] & Partial<Bounty>;
};

const recordedMessages: Record<
  string,
  Array<{ contributorId: string; message: string; timestamp: string }>
> = {};

export function useApplyForSlot() {
  const qc = useQueryClient();
  const { data: session } = authClient.useSession();

  return useMutation({
    mutationFn: async ({
      bountyId,
      applicantAddress,
    }: {
      bountyId: string;
      applicantAddress: string;
    }) => {
      const client = resolveApplicationClient();
      return client.applyForSlot({
        applicant: applicantAddress,
        bountyId: toBountyIdBigInt(bountyId),
      });
    },
    onMutate: async ({ bountyId }) => {
      await qc.cancelQueries({ queryKey: bountyKeys.detail(bountyId) });
      const prev = qc.getQueryData<ExtendedBountyQuery>(
        bountyKeys.detail(bountyId),
      );
      if (prev?.bounty) {
        const milestones = prev.bounty.milestones ?? MOCK_MODEL4_MILESTONES;
        const firstMilestoneId = milestones[0]?.id ?? "m1";
        const newProgress: ContributorProgress = {
          userId: session?.user?.id ?? "unknown-user",
          userName: session?.user?.name ?? "Contributor",
          userAvatarUrl:
            session?.user?.image ?? "https://github.com/shadcn.png",
          currentMilestoneId: firstMilestoneId,
        };
        const prevProgress = prev.bounty.contributorProgress ?? [];
        const updatedProgress = [...prevProgress, newProgress];
        const occupied = (prev.bounty.totalSlotsOccupied ?? 0) + 1;

        qc.setQueryData<ExtendedBountyQuery>(bountyKeys.detail(bountyId), {
          ...prev,
          bounty: {
            ...prev.bounty,
            totalSlotsOccupied: occupied,
            contributorProgress: updatedProgress,
          },
        });
      }
      return { prev, bountyId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(bountyKeys.detail(ctx.bountyId), ctx.prev);
    },
    onSettled: (_r, _e, variables) => {
      if (variables?.bountyId) {
        qc.invalidateQueries({
          queryKey: bountyKeys.detail(variables.bountyId),
        });
      }
      qc.invalidateQueries({ queryKey: bountyKeys.lists() });
    },
  });
}

export function useReleasePayment(bountyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contributorId,
      milestoneId,
    }: {
      contributorId: string;
      milestoneId: string;
    }) => {
      const previous = queryClient.getQueryData<ExtendedBountyQuery>(
        bountyKeys.detail(bountyId),
      );
      const totalAmount = previous?.bounty?.rewardAmount ?? 100;
      const milestonesCount = previous?.bounty?.milestones?.length ?? 1;
      const amountToRelease = totalAmount / milestonesCount;

      await EscrowService.releasePayment(bountyId, amountToRelease);
      return { contributorId, milestoneId, amountToRelease };
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: escrowKeys.pool(bountyId) });
      const prevPool = queryClient.getQueryData<EscrowPool>(
        escrowKeys.pool(bountyId),
      );

      const prevBounty = queryClient.getQueryData<ExtendedBountyQuery>(
        bountyKeys.detail(bountyId),
      );
      const totalAmount = prevBounty?.bounty?.rewardAmount ?? 100;
      const milestonesCount = prevBounty?.bounty?.milestones?.length ?? 1;
      const amountToRelease = totalAmount / milestonesCount;

      if (prevPool) {
        const newReleased = Math.min(
          prevPool.totalAmount,
          prevPool.releasedAmount + amountToRelease,
        );
        const status =
          newReleased >= prevPool.totalAmount
            ? "Fully Released"
            : "Partially Released";
        queryClient.setQueryData(escrowKeys.pool(bountyId), {
          ...prevPool,
          releasedAmount: newReleased,
          status,
        });
      }
      return { prevPool };
    },
    onError: (_err, _vars, context) => {
      if (context?.prevPool) {
        queryClient.setQueryData(escrowKeys.pool(bountyId), context.prevPool);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bountyKeys.detail(bountyId) });
      queryClient.invalidateQueries({ queryKey: escrowKeys.pool(bountyId) });
    },
  });
}

export function useAdvanceContributor(bountyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contributorId }: { contributorId: string }) => {
      await delay(1000);
      return { contributorId };
    },
    onMutate: async ({ contributorId }) => {
      await queryClient.cancelQueries({
        queryKey: bountyKeys.detail(bountyId),
      });
      const previous = queryClient.getQueryData<ExtendedBountyQuery>(
        bountyKeys.detail(bountyId),
      );

      if (previous?.bounty) {
        const contributorProgress: ContributorProgress[] =
          previous.bounty.contributorProgress || [];
        const contributorIndex = contributorProgress.findIndex(
          (c) => c.userId === contributorId,
        );

        if (contributorIndex >= 0) {
          const milestones: Milestone[] = previous.bounty.milestones || [];
          const currentMilestoneId =
            contributorProgress[contributorIndex].currentMilestoneId;
          const milestoneIndex = milestones.findIndex(
            (m) => m.id === currentMilestoneId,
          );

          if (milestoneIndex >= 0 && milestoneIndex < milestones.length - 1) {
            const nextMilestone = milestones[milestoneIndex + 1];
            const newProgress = [...contributorProgress];
            newProgress[contributorIndex] = {
              ...newProgress[contributorIndex],
              currentMilestoneId: nextMilestone.id,
            };

            queryClient.setQueryData<ExtendedBountyQuery>(
              bountyKeys.detail(bountyId),
              {
                ...previous,
                bounty: {
                  ...previous.bounty,
                  contributorProgress: newProgress,
                },
              },
            );
          }
        }
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bountyKeys.detail(bountyId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bountyKeys.detail(bountyId) });
    },
  });
}

export function useRemoveContributor(bountyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contributorId }: { contributorId: string }) => {
      await delay(1000);
      return { contributorId };
    },
    onMutate: async ({ contributorId }) => {
      await queryClient.cancelQueries({
        queryKey: bountyKeys.detail(bountyId),
      });
      const previous = queryClient.getQueryData<ExtendedBountyQuery>(
        bountyKeys.detail(bountyId),
      );

      if (previous?.bounty) {
        const contributorProgress: ContributorProgress[] =
          previous.bounty.contributorProgress || [];
        const occupied = Math.max(
          0,
          (previous.bounty.totalSlotsOccupied ?? 1) - 1,
        );

        queryClient.setQueryData<ExtendedBountyQuery>(
          bountyKeys.detail(bountyId),
          {
            ...previous,
            bounty: {
              ...previous.bounty,
              totalSlotsOccupied: occupied,
              contributorProgress: contributorProgress.filter(
                (c) => c.userId !== contributorId,
              ),
            },
          },
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(bountyKeys.detail(bountyId), context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bountyKeys.detail(bountyId) });
    },
  });
}

export function useSendMessage(bountyId: string) {
  return useMutation({
    mutationFn: async ({
      contributorId,
      message,
    }: {
      contributorId: string;
      message: string;
    }) => {
      await delay(1000);

      if (!recordedMessages[bountyId]) {
        recordedMessages[bountyId] = [];
      }
      recordedMessages[bountyId].push({
        contributorId,
        message,
        timestamp: new Date().toISOString(),
      });

      return { contributorId, message };
    },
  });
}
