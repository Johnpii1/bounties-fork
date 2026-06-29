"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { bountyKeys } from "@/lib/query/query-keys";
import { fetcher } from "@/lib/graphql/client";
import {
  ReviewSubmissionDocument,
  type BountyQuery,
  type ReviewSubmissionMutation,
  type ReviewSubmissionMutationVariables,
} from "@/lib/graphql/generated";

type RequestRevisionsVars = {
  bountyId: string;
  submissionId: string;
  feedback: string;
};

type RequestRevisionsCtx = {
  prev: BountyQuery | undefined;
  bountyId: string;
};

export function useRequestRevisions() {
  const qc = useQueryClient();

  return useMutation<
    ReviewSubmissionMutation,
    Error,
    RequestRevisionsVars,
    RequestRevisionsCtx
  >({
    mutationFn: ({ submissionId, feedback }) =>
      fetcher<ReviewSubmissionMutation, ReviewSubmissionMutationVariables>(
        ReviewSubmissionDocument,
        {
          input: {
            submissionId,
            status: "REVISION_REQUESTED",
            reviewComments: feedback,
          },
        },
      )(),
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
