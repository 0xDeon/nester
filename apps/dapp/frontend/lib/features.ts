export function isAiEnabled(
  env: Record<string, string | undefined> = { NEXT_PUBLIC_ENABLE_AI: process.env.NEXT_PUBLIC_ENABLE_AI },
): boolean {
  return env.NEXT_PUBLIC_ENABLE_AI === "true";
}

