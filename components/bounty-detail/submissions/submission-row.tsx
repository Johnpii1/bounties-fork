"use client";

import { Button } from "@/components/ui/button";
import { TransactionLink } from "@/components/ui/stellar-link";
import { BountySubmissionType } from "@/lib/graphql/generated";
import { DollarSign } from "lucide-react";
import { getStatusBadgeColor, isSafeHttpUrl } from "./submission-helpers";

interface SubmissionRowProps {
  submission: BountySubmissionType;
  isOrgMember: boolean;
  onReview: (submission: BountySubmissionType) => void;
  onMarkPaid: (submission: BountySubmissionType) => void;
}

export function SubmissionRow({
  submission,
  isOrgMember,
  onReview,
  onMarkPaid,
}: SubmissionRowProps) {
  return (
    <div className="p-3 rounded-lg border border-gray-700 bg-gray-900/30 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-gray-200">
            {submission.submittedByUser?.name || submission.submittedBy}
          </p>

          {submission.githubPullRequestUrl &&
            (isSafeHttpUrl(submission.githubPullRequestUrl) ? (
              <a
                href={submission.githubPullRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline break-all"
              >
                {submission.githubPullRequestUrl}
              </a>
            ) : (
              <span className="text-xs text-gray-400 break-all">
                {submission.githubPullRequestUrl}
              </span>
            ))}
        </div>

        <div className="flex flex-col items-end gap-2">
          <div
            className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(
              submission.status,
            )}`}
          >
            {submission.status}
          </div>

          {isOrgMember && (
            <div className="flex gap-2">
              {!submission.reviewedAt && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReview(submission)}
                >
                  Review
                </Button>
              )}

              {submission.status === "APPROVED" && !submission.paidAt && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkPaid(submission)}
                >
                  Mark Paid
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {submission.paidAt && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <DollarSign className="size-3" />
          Paid on {new Date(submission.paidAt).toLocaleDateString()}
        </div>
      )}

      {submission.rewardTransactionHash && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Transaction:</span>
          <TransactionLink
            value={submission.rewardTransactionHash}
            maxLength={10}
            showCopy={true}
            className="text-primary"
          />
        </div>
      )}
    </div>
  );
}
