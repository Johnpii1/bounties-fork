"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bountyKeys } from "@/lib/query/query-keys";
import { post } from "@/lib/api/client";
import type { DisputeReasonEnum } from "@/lib/graphql/generated";

export interface RaiseDisputeInput {
  bountyId: string;
  reason: DisputeReasonEnum;
  description: string;
}

export interface RaiseDisputeResult {
  id: string;
  campaignId: string;
  reason: string;
  description: string;
  status: string;
  createdAt: string;
}

export function useRaiseDispute() {
  const qc = useQueryClient();

  return useMutation<RaiseDisputeResult, Error, RaiseDisputeInput>({
    mutationFn: async ({ bountyId, reason, description }) => {
      return post<RaiseDisputeResult>("/api/disputes", {
        campaignId: bountyId,
        reason,
        description,
      });
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: bountyKeys.detail(variables.bountyId) });
      qc.invalidateQueries({ queryKey: bountyKeys.lists() });
    },
  });
}
