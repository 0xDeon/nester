import { test, expect } from "@playwright/test";
import { mockFreighter, TESTNET_PASSPHRASE, TEST_ADDRESS } from "./helpers/mock-freighter";

function makeAccessToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
  return `header.${payload}.signature`;
}

const ACCESS_TOKEN = makeAccessToken();

function envelope(data: unknown) {
  return { status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data }) };
}

test.describe("access token storage", () => {
  test("keeps the access token out of localStorage and restores the session through refresh on reload", async ({
    page,
  }) => {
    let refreshCalls = 0;
    let challengeCalls = 0;
    let verifyCalls = 0;

    await mockFreighter(page, { walletPassphrase: TESTNET_PASSPHRASE });
    await page.route("**/api/v1/**", async (route) => {
      const { pathname } = new URL(route.request().url());
      if (pathname.endsWith("/auth/refresh")) {
        refreshCalls++;
        return route.fulfill(envelope({ access_token: ACCESS_TOKEN, expires_in: 300, token_type: "Bearer" }));
      }
      if (pathname.endsWith("/auth/challenge")) challengeCalls++;
      if (pathname.endsWith("/auth/verify")) verifyCalls++;
      if (pathname.includes("/users/wallet/")) {
        return route.fulfill(envelope({ id: "user-1", wallet_address: TEST_ADDRESS }));
      }
      return route.fulfill(envelope([]));
    });

    const jwtKeysInLocalStorage = () =>
      page.evaluate((token) => {
        return Object.keys(window.localStorage).filter((key) =>
          (window.localStorage.getItem(key) ?? "").includes(token)
        );
      }, ACCESS_TOKEN);

    await page.goto("/");
    await expect.poll(() => refreshCalls).toBe(1);
    expect(await jwtKeysInLocalStorage()).toEqual([]);

    await page.reload();

    await expect.poll(() => refreshCalls).toBe(2);
    expect(await jwtKeysInLocalStorage()).toEqual([]);
    expect(challengeCalls).toBe(0);
    expect(verifyCalls).toBe(0);
  });

  test("removes a legacy localStorage access token on first load", async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem("nester_auth_token", "legacy-jwt"));
    await page.route("**/api/v1/**", (route) => route.fulfill(envelope([])));

    await page.goto("/");

    expect(await page.evaluate(() => window.localStorage.getItem("nester_auth_token"))).toBeNull();
  });
});
