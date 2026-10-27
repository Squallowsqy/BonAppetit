/**
 * Génère AUTH_APPLE_SECRET (JWT) à partir de la clé .p8 Apple.
 *
 * Usage:
 *   AUTH_APPLE_ID=... AUTH_APPLE_TEAM_ID=... AUTH_APPLE_KEY_ID=... \
 *   AUTH_APPLE_PRIVATE_KEY="$(cat AuthKey_XXX.p8)" \
 *   node scripts/generate-apple-client-secret.mjs
 */
import { SignJWT, importPKCS8 } from "jose";

const teamId = process.env.AUTH_APPLE_TEAM_ID;
const keyId = process.env.AUTH_APPLE_KEY_ID;
const clientId = process.env.AUTH_APPLE_ID;
let privateKey = process.env.AUTH_APPLE_PRIVATE_KEY;

if (!teamId || !keyId || !clientId || !privateKey) {
  console.error(
    "Missing AUTH_APPLE_ID, AUTH_APPLE_TEAM_ID, AUTH_APPLE_KEY_ID or AUTH_APPLE_PRIVATE_KEY"
  );
  process.exit(1);
}

privateKey = privateKey.replace(/\\n/g, "\n");
const key = await importPKCS8(privateKey, "ES256");
const now = Math.floor(Date.now() / 1000);
const secret = await new SignJWT({})
  .setProtectedHeader({ alg: "ES256", kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt(now)
  .setExpirationTime(now + 60 * 60 * 24 * 180)
  .setAudience("https://appleid.apple.com")
  .setSubject(clientId)
  .sign(key);

console.log(secret);
