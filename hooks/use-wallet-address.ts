"use client";

import { authClient } from "@/lib/auth-client";

/**
 * Returns the connected wallet address from the current session, or null
 * if the user is not signed in or has no wallet attached.
 */
export function useWalletAddress(): string | null {
  const { data: session } = authClient.useSession();
  const user = session?.user as
    | { walletAddress?: string; address?: string }
    | undefined;
  return user?.walletAddress || user?.address || null;
}
