import { isAiEnabled } from "./features";

type Env = Record<string, string | undefined>;

export function buildRewrites(env: Env): { source: string; destination: string }[] {
  const apiUrl = env.NEXT_PUBLIC_API_URL
    ? env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
    : "http://localhost:8080";
  const rewrites = [
    {
      source: "/api/v1/:path*",
      destination: `${apiUrl}/api/v1/:path*`,
    },
  ];
  if (isAiEnabled(env)) {
    const intelligenceUrl = env.INTELLIGENCE_SERVICE_URL ?? "http://localhost:8000";
    rewrites.push({
      source: "/api/intelligence/:path*",
      destination: `${intelligenceUrl}/:path*`,
    });
  }
  return rewrites;
}
