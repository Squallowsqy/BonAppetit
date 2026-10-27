import { listConfiguredOAuthProviders } from "@/lib/auth-config";

/** Public list of OAuth providers with credentials configured (no secrets). */
export async function GET() {
  return Response.json({ providers: listConfiguredOAuthProviders() });
}
