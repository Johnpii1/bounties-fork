"use client";

import {
  useMarkSubmissionPaid,
  useReviewSubmission,
  useSubmitToBounty,
} from "@/hooks/use-submission-mutations";
import { useSubmissionDraft } from "@/hooks/use-submission-draft";
import { authClient } from "@/lib/auth-client";
import { BountySubmissionType } from "@/lib/graphql/generated";
import { useEffect, useState } from "react";
import {
  MarkPaidDialog,
  ReviewSubmissionDialog,
  SubmitPRDialog,
} from "./submission-review-dialogs";
import { SubmissionRow } from "./submission-row";

interface ExtendedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  organizations?: string[];
}

export interface BountyDetailSubmissionsCardProps {
  bounty: {
    id: string;
    status: string;
    organizationId: string;
    submissions?: Array<BountySubmissionType> | null;
  };
}

export function BountyDetailSubmissionsCard({
  bounty,
}: BountyDetailSubmissionsCardProps) {
  const { data: session } = authClient.useSession();
  const submissions = bounty.submissions || [];
  const { draft, clearDraft, autoSave } = useSubmissionDraft(bounty.id);

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);

  const [selectedSubmission, setSelectedSubmission] =
    useState<BountySubmissionType | null>(null);
  const [selectedPaidSubmission, setSelectedPaidSubmission] =
    useState<BountySubmissionType | null>(null);

  const [prUrl, setPrUrl] = useState("");
  const [submitComments, setSubmitComments] = useState("");
  const [reviewComments, setReviewComments] = useState("");
  const reviewStatus = "APPROVED";
  const [transactionHash, setTransactionHash] = useState("");

  const submitToBounty = useSubmitToBounty();
  const reviewSubmission = useReviewSubmission();
  const markSubmissionPaid = useMarkSubmissionPaid();

  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (draft?.formData) {
      setPrUrl(draft.formData.githubPullRequestUrl);
      setSubmitComments(draft.formData.comments);
    }
    setIsHydrated(true);
  }, [draft]);

  useEffect(() => {
    if (!isHydrated) return;
    const cleanup = autoSave({
      githubPullRequestUrl: prUrl,
      comments: submitComments,
    });
    return cleanup;
  }, [prUrl, submitComments, autoSave, isHydrated]);

  const isOrgMember =
    (session?.user as ExtendedUser)?.organizations?.includes(
      bounty.organizationId,
    ) ?? false;

  const handleSubmitPR = async () => {
    if (!prUrl.trim()) return;
    try {
      await submitToBounty.mutateAsync({
        bountyId: bounty.id,
        githubPullRequestUrl: prUrl,
        comments: submitComments.trim() || undefined,
      });
      clearDraft();
    } catch (err) {
      console.error("Submit PR failed:", err);
    } finally {
      setPrUrl("");
      setSubmitComments("");
      setSubmitDialogOpen(false);
    }
  };

  const handleReviewSubmission = async () => {
    if (!selectedSubmission) return;
    try {
      await reviewSubmission.mutateAsync({
        submissionId: selectedSubmission.id,
        status: reviewStatus,
        reviewComments: reviewComments.trim() || undefined,
      });
    } catch (err) {
      console.error("Review submission failed:", err);
    } finally {
      setReviewDialogOpen(false);
      setSelectedSubmission(null);
      setReviewComments("");
    }
  };

  const handleMarkPaid = async (submission: BountySubmissionType) => {
    if (!transactionHash.trim()) return;
    try {
      await markSubmissionPaid.mutateAsync({
        submissionId: submission.id,
        transactionHash: transactionHash.trim(),
      });
    } catch (err) {
      console.error("Mark paid failed:", err);
    } finally {
      setTransactionHash("");
      setSelectedPaidSubmission(null);
      setMarkPaidDialogOpen(false);
    }
  };

  const handleReviewClick = (submission: BountySubmissionType) => {
    setSelectedSubmission(submission);
    setReviewDialogOpen(true);
  };

  const handleMarkPaidClick = (submission: BountySubmissionType) => {
    setSelectedPaidSubmission(submission);
    setMarkPaidDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {bounty.status === "OPEN" && (
        <div className="p-5 rounded-xl border border-gray-800 bg-background-card space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">
            Submit Your PR
          </h3>

          <SubmitPRDialog
            open={submitDialogOpen}
            onOpenChange={setSubmitDialogOpen}
            prUrl={prUrl}
            onPrUrlChange={setPrUrl}
            submitComments={submitComments}
            onSubmitCommentsChange={setSubmitComments}
            draftUpdatedAt={draft?.updatedAt}
            onSubmit={handleSubmitPR}
            isPending={submitToBounty.isPending}
          />
        </div>
      )}

      {submissions.length > 0 && (
        <div className="p-5 rounded-xl border border-gray-800 bg-background-card space-y-4">
          <h3 className="text-sm font-semibold text-gray-200">
            Submissions ({submissions.length})
          </h3>

          <div className="space-y-3">
            {submissions.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                isOrgMember={isOrgMember}
                onReview={handleReviewClick}
                onMarkPaid={handleMarkPaidClick}
              />
            ))}
          </div>
        </div>
      )}

      <ReviewSubmissionDialog
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        reviewComments={reviewComments}
        onReviewCommentsChange={setReviewComments}
        onSubmit={handleReviewSubmission}
      />

      <MarkPaidDialog
        open={markPaidDialogOpen}
        onOpenChange={setMarkPaidDialogOpen}
        transactionHash={transactionHash}
        onTransactionHashChange={setTransactionHash}
        selectedSubmission={selectedPaidSubmission}
        onConfirm={handleMarkPaid}
        isPending={markSubmissionPaid.isPending}
      />
    </div>
  );
}
