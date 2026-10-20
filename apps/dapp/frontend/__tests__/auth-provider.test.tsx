import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/components/auth-provider";
import { setAccessToken, clearTokens } from "@/lib/auth/token-store";

const refresh = vi.fn();
const requestChallenge = vi.fn();

vi.mock("@/components/wallet-provider", () => ({
  useWallet: vi.fn(() => ({ address: "GABC123" })),
}));

vi.mock("@/lib/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/client")>();
  return {
    ...actual,
    api: { ...actual.api, auth: {
        ...actual.api.auth,
        refresh: () => refresh(),
        requestChallenge: (address: string) => requestChallenge(address),
      } },
  };
});

function AuthConsumer() {
  const { token, signIn } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? "none"}</span>
      <button onClick={() => signIn()}>Sign in</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    refresh.mockReset();
    requestChallenge.mockReset();
    clearTokens();
    window.localStorage.clear();
  });

  it("restores the session from the refresh cookie on load", async () => {
    refresh.mockImplementation(async () => {
      setAccessToken("jwt-refreshed");
      return { access_token: "jwt-refreshed" };
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("jwt-refreshed"));
    expect(Object.values(window.localStorage)).not.toContain("jwt-refreshed");
  });

  it("signIn reuses a refreshable session instead of asking the wallet to sign again", async () => {
    refresh.mockImplementation(async () => {
      setAccessToken("jwt-refreshed");
      return { access_token: "jwt-refreshed" };
    });

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(screen.getByTestId("token")).toHaveTextContent("jwt-refreshed"));
    expect(requestChallenge).not.toHaveBeenCalled();
  });

  it("stays signed out when the refresh cookie is rejected", async () => {
    refresh.mockRejectedValue(new Error("no session"));

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("token")).toHaveTextContent("none");
  });

  it("does not try to restore a session without a connected wallet", async () => {
    const { useWallet } = await import("@/components/wallet-provider");
    vi.mocked(useWallet).mockReturnValue({ address: null } as ReturnType<typeof useWallet>);

    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("token")).toHaveTextContent("none");
    expect(refresh).not.toHaveBeenCalled();
  });
});
