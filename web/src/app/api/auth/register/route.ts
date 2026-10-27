import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userVaults, users } from "@/lib/db/schema";
import {
  hashPasswordSecure,
  validatePasswordStrength,
} from "@/lib/security/password";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { registerBodySchema } from "@/lib/security/validate";
import { emptyVaultData } from "@/lib/vault-types";

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit({
    key: `register:${ip}`,
    limit: 5,
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 }
    );
  }

  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message || "Données invalides.";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const strength = validatePasswordStrength(password);
  if (strength) {
    return Response.json({ ok: false, error: strength }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    // Same message as generic failure path for enumeration resistance
    return Response.json(
      { ok: false, error: "Impossible de créer ce compte." },
      { status: 409 }
    );
  }

  const passwordHash = await hashPasswordSecure(password);
  const id = crypto.randomUUID();

  await db.insert(users).values({
    id,
    name,
    email,
    passwordHash,
  });

  await db.insert(userVaults).values({
    userId: id,
    data: emptyVaultData(),
  });

  return Response.json({ ok: true, email });
}
