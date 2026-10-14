/** Only allow same-site relative redirects (prevents open redirects via ?next=). */
export function safeNext(value: unknown, fallback = "/dashboard"): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}
