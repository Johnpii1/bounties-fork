"use client";

import { useState } from "react";
import type React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RatingStars } from "./rating-stars";

interface RatingModalProps {
  contributor: {
    id: string;
    name: string;
    reputation: number;
  };
  bounty: {
    id: string;
    title: string;
  };
  onSubmit: (rating: number, feedback: string) => Promise<void>;
  onClose: () => void;
}

export const RatingModal = ({
  contributor,
  bounty,
  onSubmit,
  onClose,
}: RatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError("Please select a rating between 1 and 5.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(rating, feedback);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to submit rating. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent>
        {success ? (
          <>
            <DialogHeader>
              <DialogTitle>Success!</DialogTitle>
              <DialogDescription>
                Rating submitted. Contributor reputation updated.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Rate Contributor</DialogTitle>
              <DialogDescription>
                Provide a rating and optional feedback for the contributor.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <div>
                <strong>Bounty:</strong> {bounty.title}
              </div>
              <div>
                <strong>Contributor:</strong> {contributor.name}
              </div>
              <div>
                <strong>Current Reputation:</strong> {contributor.reputation}
              </div>

              <div className="mt-4">
                <RatingStars value={rating} onChange={setRating} />
              </div>

              <Textarea
                placeholder="Optional feedback"
                value={feedback}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFeedback(e.target.value)
                }
                rows={3}
                className="min-h-[6rem]"
              />

              {error && <div className="text-destructive">{error}</div>}
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
