import { Users, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BountyFieldsFragment } from "@/lib/graphql/generated";
import type { Bounty } from "@/types/bounty";
import type { useBountyCTAState } from "../use-bounty-cta-state";

type SidebarBounty = BountyFieldsFragment & Partial<Bounty>;

interface CompetitionCtaProps {
  bounty: SidebarBounty;
  state: Pick<
    ReturnType<typeof useBountyCTAState>,
    | "hasJoined"
    | "canAct"
    | "isPastDeadline"
    | "joinMutation"
    | "walletAddress"
    | "handleJoin"
    | "ctaLabel"
  >;
}

export function CompetitionCta({ state }: CompetitionCtaProps) {
  const {
    hasJoined,
    canAct,
    isPastDeadline,
    joinMutation,
    walletAddress,
    handleJoin,
    ctaLabel,
  } = state;

  return (
    <>
      {hasJoined ? (
        <Button
          className="w-full h-11 font-bold tracking-wide"
          disabled
          size="lg"
        >
          Joined ✓
        </Button>
      ) : (
        <Button
          data-testid="apply-to-bounty-btn"
          className="w-full h-11 font-bold tracking-wide"
          disabled={
            !canAct ||
            isPastDeadline ||
            joinMutation.isPending ||
            !walletAddress
          }
          size="lg"
          onClick={() => void handleJoin()}
        >
          {joinMutation.isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Users className="mr-2 size-4" />
          )}
          {canAct && !isPastDeadline ? "Join Competition" : ctaLabel()}
        </Button>
      )}

      {!hasJoined && isPastDeadline && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 justify-center text-center">
          <Clock className="size-3 shrink-0" />
          Submission deadline has passed.
        </p>
      )}
    </>
  );
}
