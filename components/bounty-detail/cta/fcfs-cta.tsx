import { FcfsClaimButton } from "@/components/bounty/fcfs-claim-button";
import { AlertCircle } from "lucide-react";
import type { BountyFieldsFragment } from "@/lib/graphql/generated";
import type { Bounty } from "@/types/bounty";
import type { useBountyCTAState } from "../use-bounty-cta-state";

type SidebarBounty = BountyFieldsFragment & Partial<Bounty>;

interface FcfsCtaProps {
  bounty: SidebarBounty;
  state: Pick<ReturnType<typeof useBountyCTAState>, "canAct">;
}

export function FcfsCta({ bounty, state }: FcfsCtaProps) {
  const { canAct } = state;

  return (
    <>
      <FcfsClaimButton bounty={bounty} />
      {!canAct && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 justify-center text-center">
          <AlertCircle className="size-3 shrink-0" />
          This bounty is no longer accepting new submissions.
        </p>
      )}
    </>
  );
}
