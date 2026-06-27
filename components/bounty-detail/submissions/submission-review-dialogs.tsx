"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BountySubmissionType } from "@/lib/graphql/generated";
import { Loader2 } from "lucide-react";

interface SubmitPRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prUrl: string;
  onPrUrlChange: (value: string) => void;
  submitComments: string;
  onSubmitCommentsChange: (value: string) => void;
  draftUpdatedAt?: string;
  onSubmit: () => void;
  isPending: boolean;
}

export function SubmitPRDialog({
  open,
  onOpenChange,
  prUrl,
  onPrUrlChange,
  submitComments,
  onSubmitCommentsChange,
  draftUpdatedAt,
  onSubmit,
  isPending,
}: SubmitPRDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full">Submit PR to Bounty</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Pull Request</DialogTitle>
          <DialogDescription>
            Submit your GitHub pull request URL.
            {draftUpdatedAt && (
              <span className="block mt-1 text-xs text-blue-400">
                Draft restored from {new Date(draftUpdatedAt).toLocaleString()}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pr-url">Pull Request URL</Label>
            <Input
              id="pr-url"
              value={prUrl}
              onChange={(e) => onPrUrlChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submit-comments">Comments</Label>
            <Textarea
              id="submit-comments"
              value={submitComments}
              onChange={(e) => onSubmitCommentsChange(e.target.value)}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!prUrl.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Submit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface ReviewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewComments: string;
  onReviewCommentsChange: (value: string) => void;
  onSubmit: () => void;
}

export function ReviewSubmissionDialog({
  open,
  onOpenChange,
  reviewComments,
  onReviewCommentsChange,
  onSubmit,
}: ReviewSubmissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            placeholder="Add review feedback..."
            value={reviewComments}
            onChange={(e) => onReviewCommentsChange(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={onSubmit}>Submit Review</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionHash: string;
  onTransactionHashChange: (value: string) => void;
  selectedSubmission: BountySubmissionType | null;
  onConfirm: (submission: BountySubmissionType) => void;
  isPending: boolean;
}

export function MarkPaidDialog({
  open,
  onOpenChange,
  transactionHash,
  onTransactionHashChange,
  selectedSubmission,
  onConfirm,
  isPending,
}: MarkPaidDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Submission as Paid</DialogTitle>
          <DialogDescription>Enter the transaction hash.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={transactionHash}
            onChange={(e) => onTransactionHashChange(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() =>
                selectedSubmission && onConfirm(selectedSubmission)
              }
              disabled={!transactionHash.trim() || isPending}
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
