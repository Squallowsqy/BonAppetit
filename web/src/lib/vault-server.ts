import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userVaults } from "@/lib/db/schema";
import { assertVaultSize } from "@/lib/security/validate";
import {
  emptyVaultData,
  normalizeVault,
  type UserVaultData,
} from "@/lib/vault-types";

export async function getVaultForUser(userId: string): Promise<UserVaultData> {
  const [row] = await db
    .select()
    .from(userVaults)
    .where(eq(userVaults.userId, userId))
    .limit(1);

  if (!row) {
    const data = emptyVaultData();
    await db.insert(userVaults).values({ userId, data });
    return data;
  }
  return normalizeVault(row.data);
}

export async function putVaultForUser(
  userId: string,
  raw: unknown
): Promise<UserVaultData> {
  const data = normalizeVault(raw);
  assertVaultSize(data);

  const [existing] = await db
    .select({ userId: userVaults.userId })
    .from(userVaults)
    .where(eq(userVaults.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(userVaults)
      .set({ data, updatedAt: new Date() })
      .where(eq(userVaults.userId, userId));
  } else {
    await db.insert(userVaults).values({ userId, data });
  }
  return data;
}

export function isVaultEmpty(v: UserVaultData): boolean {
  return (
    v.favorites.length === 0 &&
    Object.keys(v.ratings || {}).length === 0 &&
    v.baskets.length === 0 &&
    v.groceryLists.length === 0 &&
    v.tasteEvents.length === 0
  );
}
