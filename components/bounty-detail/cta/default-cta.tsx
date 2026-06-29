import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BountyFieldsFragment } from "@/lib/graphql/generated";
import type { Bounty } from "@/types/bounty";
import type { useBountyCTAState } from "../use-bounty-cta-state";

type SidebarBounty = BountyFieldsFragment & Partial<Bounty>;

interface DefaultCtaProps {
  bounty: SidebarBounty;
  state: Pick<ReturnType<typeof useBountyCTAState>, "canAct" | "ctaLabel">;
}

export function DefaultCta({ bounty, state }: DefaultCtaProps) {
  const { canAct, ctaLabel } = state;

  return (
    <>
      <Button
        className="w-full h-11 font-bold tracking-wide"
        disabled={!canAct}
        size="lg"
        onClick={() =>
          canAct &&
          window.open(bounty.githubIssueUrl, "_blank", "noopener,noreferrer")
        }
      >
        {ctaLabel()}
      </Button>

      {!canAct && (
        <p className="flex items-center gap-1.5 text-xs text-gray-500 justify-center text-center">
          <AlertCircle className="size-3 shrink-0" />
          This bounty is no longer accepting new submissions.
        </p>
      )}
    </>
  );
}
