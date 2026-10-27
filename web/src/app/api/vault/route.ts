import { auth } from "@/lib/auth-config";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import {
  getVaultForUser,
  isVaultEmpty,
  putVaultForUser,
} from "@/lib/vault-server";
import { normalizeVault } from "@/lib/vault-types";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const vault = await getVaultForUser(userId);
  return Response.json({
    ok: true,
    vault,
    empty: isVaultEmpty(vault),
    user: {
      id: userId,
      email: session.user?.email ?? null,
      name: session.user?.name ?? null,
    },
  });
}

export async function PUT(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const ip = clientIp(req);
  const limited = rateLimit({
    key: `vault-put:${userId}:${ip}`,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!limited.ok) {
    return Response.json(
      { ok: false, error: "Trop de requêtes." },
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
    return Response.json({ ok: false, error: "JSON invalide." }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" && "vault" in body
      ? (body as { vault: unknown }).vault
      : body;

  try {
    const vault = await putVaultForUser(userId, normalizeVault(payload));
    return Response.json({ ok: true, vault });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur.";
    return Response.json({ ok: false, error: msg }, { status: 400 });
  }
}
