/**
 * Privacy options shared by every Sentry runtime init (client, server, edge).
 *
 * The dapp handles wallet addresses, signed XDR and balances, so Sentry's
 * default PII collection and session replay (which records form inputs such
 * as deposit amounts) stay off, and breadcrumbs are scrubbed as captured.
 */
import { scrubSentryBreadcrumb } from "@/lib/observability/sentry-scrub";

export const sentryPrivacyOptions = {
  sendDefaultPii: false,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeBreadcrumb: scrubSentryBreadcrumb,
};
