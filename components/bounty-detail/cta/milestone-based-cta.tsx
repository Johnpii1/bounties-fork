import { Button } from "@/components/ui/button";
import { ApplicationDialog } from "@/components/bounty/application-dialog";
import type { BountyFieldsFragment } from "@/lib/graphql/generated";
import type { Bounty } from "@/types/bounty";
import type { useBountyCTAState } from "../use-bounty-cta-state";

type SidebarBounty = BountyFieldsFragment & Partial<Bounty>;

interface MilestoneBasedCtaProps {
  bounty: SidebarBounty;
  state: Pick<
    ReturnType<typeof useBountyCTAState>,
    "walletAddress" | "handleApply"
  >;
}

export function MilestoneBasedCta({ bounty, state }: MilestoneBasedCtaProps) {
  const { walletAddress, handleApply } = state;

  return (
    <ApplicationDialog
      bountyTitle={bounty.title}
      onApply={handleApply}
      trigger={
        <Button
          className="w-full h-11 font-bold tracking-wide"
          size="lg"
          disabled={!walletAddress}
        >
          Apply for Bounty
        </Button>
      }
    />
  );
}
