import { renderHook } from "@testing-library/react";
import { useWalletAddress } from "../use-wallet-address";
import { authClient } from "@/lib/auth-client";

jest.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: jest.fn(),
  },
}));

describe("useWalletAddress", () => {
  it("returns null when there is no session", () => {
    (authClient.useSession as jest.Mock).mockReturnValue({ data: null });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current).toBeNull();
  });

  it("returns null when session has no user", () => {
    (authClient.useSession as jest.Mock).mockReturnValue({
      data: { user: undefined },
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current).toBeNull();
  });

  it("returns walletAddress when available", () => {
    (authClient.useSession as jest.Mock).mockReturnValue({
      data: { user: { walletAddress: "0xABC", address: "0xDEF" } },
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current).toBe("0xABC");
  });

  it("falls back to address when walletAddress is missing", () => {
    (authClient.useSession as jest.Mock).mockReturnValue({
      data: { user: { address: "0xDEF" } },
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current).toBe("0xDEF");
  });

  it("returns null when neither walletAddress nor address exists", () => {
    (authClient.useSession as jest.Mock).mockReturnValue({
      data: { user: { name: "test" } },
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current).toBeNull();
  });
});
