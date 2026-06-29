import { Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BountyFieldsFragment } from "@/lib/graphql/generated";
import type { Bounty } from "@/types/bounty";
import type { useBountyCTAState } from "../use-bounty-cta-state";

type SidebarBounty = BountyFieldsFragment & Partial<Bounty>;

interface MultiWinnerCtaProps {
  bounty: SidebarBounty;
  state: Pick<
    ReturnType<typeof useBountyCTAState>,
    | "isSlotsFull"
    | "isAlreadyJoined"
    | "walletAddress"
    | "applyForSlotMutation"
    | "handleApplyForSlot"
    | "applyForSlotButtonLabel"
  >;
}

export function MultiWinnerCta({ state }: MultiWinnerCtaProps) {
  const {
    isSlotsFull,
    isAlreadyJoined,
    walletAddress,
    applyForSlotMutation,
    handleApplyForSlot,
    applyForSlotButtonLabel,
  } = state;

  return (
    <Button
      className="w-full h-11 font-bold tracking-wide"
      disabled={
        isSlotsFull ||
        isAlreadyJoined ||
        !walletAddress ||
        applyForSlotMutation.isPending
      }
      size="lg"
      onClick={() => void handleApplyForSlot()}
    >
      {applyForSlotMutation.isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Users className="mr-2 size-4" />
      )}
      {applyForSlotButtonLabel}
    </Button>
  );
}
