import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquant. Lie Neon au projet ou définis DATABASE_URL dans .env.local."
    );
  }
  return url;
}

const sql = neon(requireDatabaseUrl());

export const db = drizzle(sql, { schema });
