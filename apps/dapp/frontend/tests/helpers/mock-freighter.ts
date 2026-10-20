import type { Page } from "@playwright/test";

export const TEST_ADDRESS = "GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI";

export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
export const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

/**
 * Emulates the Freighter extension's window.postMessage bridge so the dapp
 * (via stellar-wallets-kit and @stellar/freighter-api) sees a connected wallet
 * reporting `walletPassphrase`, and pre-seeds the saved wallet session.
 */
export async function mockFreighter(
  page: Page,
  opts: { walletPassphrase: string; dappNetwork?: "testnet" | "mainnet" }
) {
  await page.addInitScript(
    ({ address, walletPassphrase, dappNetwork }) => {
      window.localStorage.setItem("nester_wallet_id", "freighter");
      window.localStorage.setItem("nester_wallet_addr", address);
      if (dappNetwork) window.localStorage.setItem("nester_network_id", dappNetwork);

      const w = window as unknown as { __freighterSignCalls: number };
      w.__freighterSignCalls = 0;

      const respond = (type: string, payload: Record<string, unknown>) => {
        switch (type) {
          case "REQUEST_CONNECTION_STATUS":
            return { isConnected: true };
          case "REQUEST_ALLOWED_STATUS":
          case "SET_ALLOWED_STATUS":
            return { isAllowed: true };
          case "REQUEST_ACCESS":
          case "REQUEST_PUBLIC_KEY":
            return { publicKey: address };
          case "REQUEST_NETWORK":
            return { network: "MOCK", networkPassphrase: walletPassphrase };
          case "REQUEST_NETWORK_DETAILS":
            return {
              networkDetails: {
                network: "MOCK",
                networkName: "MOCK",
                networkUrl: "",
                networkPassphrase: walletPassphrase,
              },
            };
          case "SUBMIT_BLOB":
            return { signedMessage: "c2lnbmVk" };
          case "SUBMIT_TRANSACTION":
            w.__freighterSignCalls++;
            return { signedTransaction: payload.transactionXdr, signerAddress: address };
          default:
            return {};
        }
      };

      window.addEventListener("message", (event) => {
        const data = event.data;
        if (event.source !== window || data?.source !== "FREIGHTER_EXTERNAL_MSG_REQUEST") return;
        window.postMessage(
          {
            source: "FREIGHTER_EXTERNAL_MSG_RESPONSE",
            messagedId: data.messageId,
            ...respond(data.type, data),
          },
          window.location.origin
        );
      });
    },
    { address: TEST_ADDRESS, ...opts }
  );
}
