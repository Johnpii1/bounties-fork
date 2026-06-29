"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import { DisputeReasonEnum } from "@/lib/graphql/generated";
import { useRaiseDispute } from "@/hooks/use-dispute-mutations";

const DISPUTE_REASON_LABELS: Record<DisputeReasonEnum, string> = {
  [DisputeReasonEnum.MilestoneNotDelivered]: "Milestone Not Delivered",
  [DisputeReasonEnum.PoorQualityWork]: "Poor Quality Work",
  [DisputeReasonEnum.DeadlineMissed]: "Deadline Missed",
  [DisputeReasonEnum.ScopeChange]: "Scope Change",
  [DisputeReasonEnum.MisuseOfFunds]: "Misuse of Funds",
  [DisputeReasonEnum.CommunicationIssues]: "Communication Issues",
  [DisputeReasonEnum.Other]: "Other",
};

interface RaiseDisputeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bountyId: string;
}

export function RaiseDisputeDialog({
  open,
  onOpenChange,
  bountyId,
}: RaiseDisputeDialogProps) {
  const router = useRouter();
  const raiseDisputeMutation = useRaiseDispute();

  const [disputeReason, setDisputeReason] = useState<DisputeReasonEnum | "">(
    "",
  );
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeReasonError, setDisputeReasonError] = useState("");
  const [disputeDescriptionError, setDisputeDescriptionError] = useState("");

  const resetForm = () => {
    setDisputeReason("");
    setDisputeDescription("");
    setDisputeReasonError("");
    setDisputeDescriptionError("");
  };

  const handleRaiseDispute = async () => {
    let valid = true;
    if (!disputeReason) {
      setDisputeReasonError("Please select a reason.");
      valid = false;
    } else {
      setDisputeReasonError("");
    }
    if (!disputeDescription.trim()) {
      setDisputeDescriptionError("Please describe the dispute.");
      valid = false;
    } else {
      setDisputeDescriptionError("");
    }
    if (!valid) return;

    try {
      const result = await raiseDisputeMutation.mutateAsync({
        bountyId,
        reason: disputeReason as DisputeReasonEnum,
        description: disputeDescription.trim(),
      });
      resetForm();
      onOpenChange(false);
      toast.success("Dispute filed successfully.");
      router.push(`/dispute/${result.id}`);
    } catch {
      toast.error("Failed to file dispute. Please try again.");
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!raiseDisputeMutation.isPending) {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            resetForm();
          }
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-400">
            <Gavel className="size-5" />
            Raise a Dispute
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Describe the issue with this bounty. A moderator will review your
            dispute and reach out to both parties.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="dispute-reason" className="text-sm font-medium">
              Reason <span className="text-red-400">*</span>
            </Label>
            <Select
              value={disputeReason}
              onValueChange={(val) => {
                setDisputeReason(val as DisputeReasonEnum);
                setDisputeReasonError("");
              }}
              disabled={raiseDisputeMutation.isPending}
            >
              <SelectTrigger
                id="dispute-reason"
                className={disputeReasonError ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {(Object.values(DisputeReasonEnum) as DisputeReasonEnum[]).map(
                  (value) => (
                    <SelectItem key={value} value={value}>
                      {DISPUTE_REASON_LABELS[value]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            {disputeReasonError && (
              <p className="text-xs text-red-400">{disputeReasonError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="dispute-description"
              className="text-sm font-medium"
            >
              Description <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="dispute-description"
              placeholder="Explain what happened and why you are raising this dispute…"
              value={disputeDescription}
              onChange={(e) => {
                setDisputeDescription(e.target.value);
                setDisputeDescriptionError("");
              }}
              className={`min-h-24 resize-none ${disputeDescriptionError ? "border-red-500" : ""}`}
              disabled={raiseDisputeMutation.isPending}
            />
            {disputeDescriptionError && (
              <p className="text-xs text-red-400">{disputeDescriptionError}</p>
            )}
          </div>
        </div>

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={raiseDisputeMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => void handleRaiseDispute()}
            disabled={raiseDisputeMutation.isPending}
          >
            {raiseDisputeMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Submit Dispute
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
