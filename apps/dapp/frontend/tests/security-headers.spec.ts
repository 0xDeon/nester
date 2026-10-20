import { test, expect } from "@playwright/test";

const ROUTES = ["/", "/dashboard"];

function directive(csp: string, name: string): string[] {
  const found = csp.split("; ").find((part) => part.startsWith(`${name} `));
  return found ? found.slice(name.length + 1).split(" ") : [];
}

for (const route of ROUTES) {
  test.describe(`security headers on ${route}`, () => {
    test("sends CSP and hardening headers", async ({ page }) => {
      const response = await page.goto(route);
      expect(response).not.toBeNull();
      const headers = response!.headers();

      const csp = headers["content-security-policy"];
      expect(csp, "Content-Security-Policy header").toBeTruthy();
      expect(directive(csp, "default-src")).toEqual(["'self'"]);
      expect(directive(csp, "frame-ancestors")).toEqual(["'none'"]);
      expect(directive(csp, "object-src")).toEqual(["'none'"]);
      expect(directive(csp, "base-uri")).toEqual(["'self'"]);
      expect(directive(csp, "script-src").some((v) => v.startsWith("'nonce-"))).toBe(true);
      expect(directive(csp, "script-src")).not.toContain("'unsafe-inline'");

      const connectSrc = directive(csp, "connect-src");
      expect(connectSrc).toContain("'self'");
      expect(connectSrc.join(" ")).toMatch(/stellar\.org/);

      expect(headers["strict-transport-security"]).toContain("max-age=");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
      expect(headers["permissions-policy"]).toContain("camera=()");
    });

    test("uses a fresh nonce per request", async ({ request }) => {
      const nonceOf = async () => {
        const res = await request.get(route);
        const csp = res.headers()["content-security-policy"] ?? "";
        return directive(csp, "script-src").find((v) => v.startsWith("'nonce-"));
      };
      const [first, second] = [await nonceOf(), await nonceOf()];
      expect(first).toBeTruthy();
      expect(first).not.toEqual(second);
    });

    test("loads with no CSP violations", async ({ page }) => {
      await page.addInitScript(() => {
        (window as unknown as { __cspViolations: string[] }).__cspViolations = [];
        document.addEventListener("securitypolicyviolation", (event) => {
          (window as unknown as { __cspViolations: string[] }).__cspViolations.push(
            `${event.violatedDirective} blocked ${event.blockedURI}`
          );
        });
      });
      const consoleViolations: string[] = [];
      page.on("console", (message) => {
        if (/content security policy/i.test(message.text())) {
          consoleViolations.push(message.text());
        }
      });

      await page.goto(route);
      await page.waitForLoadState("networkidle");

      const violations = await page.evaluate(
        () => (window as unknown as { __cspViolations: string[] }).__cspViolations
      );
      expect([...violations, ...consoleViolations]).toEqual([]);
    });
  });
}
