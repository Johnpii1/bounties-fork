"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bountyKeys } from "@/lib/query/query-keys";
import { type BountyQuery } from "@/lib/graphql/generated";
import {
  resolveApplicationClient,
  toBountyIdBigInt,
} from "./use-application-contracts";

type DeclinedApplicationRecord = {
  id?: string;
  bountyId?: string;
  applicantAddress?: string;
  status?: string;
  declineReason?: string;
  declinedAt?: string;
};

type BountyWithApplications = BountyQuery & {
  bounty?: BountyQuery["bounty"] & {
    applications?: DeclinedApplicationRecord[];
  };
};

export function useApplyToBounty() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bountyId,
      applicantAddress,
      proposal,
    }: {
      bountyId: string;
      applicantAddress: string;
      proposal: string;
    }) => {
      const client = resolveApplicationClient();
      return client.apply({
        applicant: applicantAddress,
        bountyId: toBountyIdBigInt(bountyId),
        proposal,
      });
    },
    onSettled: (_r, _e, v) => {
      qc.invalidateQueries({ queryKey: bountyKeys.detail(v.bountyId) });
    },
  });
}

export function useSelectApplicant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bountyId,
      creatorAddress,
      applicantAddress,
    }: {
      bountyId: string;
      creatorAddress: string;
      applicantAddress: string;
    }) => {
      const client = resolveApplicationClient();
      return client.selectApplicant({
        creator: creatorAddress,
        bountyId: toBountyIdBigInt(bountyId),
        applicant: applicantAddress,
      });
    },
    onMutate: async ({ bountyId }) => {
      await qc.cancelQueries({ queryKey: bountyKeys.detail(bountyId) });
      const prev = qc.getQueryData<BountyQuery>(bountyKeys.detail(bountyId));
      if (prev?.bounty) {
        qc.setQueryData<BountyQuery>(bountyKeys.detail(bountyId), {
          ...prev,
          bounty: {
            ...prev.bounty,
            status: "IN_PROGRESS",
            updatedAt: new Date().toISOString(),
          },
        });
      }
      return { prev, bountyId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(bountyKeys.detail(ctx.bountyId), ctx.prev);
    },
    onSettled: (_r, _e, v) => {
      qc.invalidateQueries({ queryKey: bountyKeys.detail(v.bountyId) });
      qc.invalidateQueries({ queryKey: bountyKeys.lists() });
    },
  });
}

export function useDeclineApplicant() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bountyId,
      applicantAddress,
      reason,
    }: {
      bountyId: string;
      applicantAddress: string;
      reason?: string;
    }) => {
      return {
        bountyId,
        applicantAddress,
        reason: reason?.trim() || undefined,
        declinedAt: new Date().toISOString(),
      };
    },

    onMutate: async ({ bountyId, applicantAddress, reason }) => {
      await qc.cancelQueries({ queryKey: bountyKeys.detail(bountyId) });

      const prev = qc.getQueryData<BountyWithApplications>(
        bountyKeys.detail(bountyId),
      );

      if (prev?.bounty?.applications) {
        const declinedAt = new Date().toISOString();

        qc.setQueryData<BountyWithApplications>(bountyKeys.detail(bountyId), {
          ...prev,
          bounty: {
            ...prev.bounty,
            applications: prev.bounty.applications
              .map((application) =>
                application.applicantAddress === applicantAddress
                  ? {
                      ...application,
                      status: "DECLINED",
                      declineReason: reason?.trim() || undefined,
                      declinedAt,
                    }
                  : application,
              )
              .filter(
                (application) =>
                  application.applicantAddress !== applicantAddress,
              ),
            updatedAt: declinedAt,
          },
        });
      }

      return { prev, bountyId };
    },

    onError: (_error, _variables, context) => {
      if (context?.prev) {
        qc.setQueryData(bountyKeys.detail(context.bountyId), context.prev);
      }
    },

    onSettled: (_result, _error, variables) => {
      qc.invalidateQueries({ queryKey: bountyKeys.detail(variables.bountyId) });
      qc.invalidateQueries({ queryKey: bountyKeys.lists() });
    },
  });
}

export function useSubmitApplicationWork() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bountyId,
      contributorAddress,
      workCid,
    }: {
      bountyId: string;
      contributorAddress: string;
      workCid: string;
    }) => {
      const client = resolveApplicationClient();
      return client.submitWork({
        contributor: contributorAddress,
        bountyId: toBountyIdBigInt(bountyId),
        workCid,
      });
    },
    onMutate: async ({ bountyId }) => {
      await qc.cancelQueries({ queryKey: bountyKeys.detail(bountyId) });
      const prev = qc.getQueryData<BountyQuery>(bountyKeys.detail(bountyId));
      if (prev?.bounty) {
        qc.setQueryData<BountyQuery>(bountyKeys.detail(bountyId), {
          ...prev,
          bounty: {
            ...prev.bounty,
            status: "UNDER_REVIEW",
            updatedAt: new Date().toISOString(),
          },
        });
      }
      return { prev, bountyId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(bountyKeys.detail(ctx.bountyId), ctx.prev);
    },
    onSettled: (_r, _e, v) => {
      qc.invalidateQueries({ queryKey: bountyKeys.detail(v.bountyId) });
      qc.invalidateQueries({ queryKey: bountyKeys.lists() });
    },
  });
}

export function useApproveApplicationSubmission() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bountyId,
      creatorAddress,
      points,
    }: {
      bountyId: string;
      creatorAddress: string;
      points: number;
    }) => {
      const client = resolveApplicationClient();
      return client.approveSubmission({
        creator: creatorAddress,
        bountyId: toBountyIdBigInt(bountyId),
        points,
      });
    },
    onMutate: async ({ bountyId }) => {
      await qc.cancelQueries({ queryKey: bountyKeys.detail(bountyId) });
      const prev = qc.getQueryData<BountyQuery>(bountyKeys.detail(bountyId));
      if (prev?.bounty) {
        qc.setQueryData<BountyQuery>(bountyKeys.detail(bountyId), {
          ...prev,
          bounty: {
            ...prev.bounty,
            status: "COMPLETED",
            updatedAt: new Date().toISOString(),
          },
        });
      }
      return { prev, bountyId };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(bountyKeys.detail(ctx.bountyId), ctx.prev);
    },
    onSettled: (_r, _e, v) => {
      qc.invalidateQueries({ queryKey: bountyKeys.detail(v.bountyId) });
      qc.invalidateQueries({ queryKey: bountyKeys.lists() });
    },
  });
}
