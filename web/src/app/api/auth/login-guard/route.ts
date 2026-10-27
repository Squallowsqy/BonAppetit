import { clientIp, rateLimit } from "@/lib/security/rate-limit";

/** Pre-flight rate limit before client calls Auth.js credentials signIn. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit({
    key: `login:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Trop de tentatives. Réessaie plus tard." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }
  return Response.json({ ok: true });
}
