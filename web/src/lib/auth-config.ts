import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { Provider } from "next-auth/providers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  authenticators,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import type { OAuthProviderId } from "@/lib/oauth-types";
import {
  dummyPasswordCheck,
  verifyPasswordSecure,
} from "@/lib/security/password";
import { emailSchema } from "@/lib/security/validate";

export type { OAuthProviderId } from "@/lib/oauth-types";

function requireAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET manquant ou trop court (min 32 caractères) en production."
      );
    }
    // Dev only — never use in production
    return "dev-only-insecure-secret-change-me-32chars";
  }
  return secret;
}

function hasGoogleEnv() {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

function hasAppleEnv() {
  return Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
}

export function listConfiguredOAuthProviders(): OAuthProviderId[] {
  const ids: OAuthProviderId[] = [];
  if (hasAppleEnv()) ids.push("apple");
  if (hasGoogleEnv()) ids.push("google");
  return ids;
}

function buildProviders(): Provider[] {
  const providers: Provider[] = [
    Credentials({
      id: "credentials",
      name: "E-mail",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const parsed = emailSchema.safeParse(credentials?.email);
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";
        if (!parsed.success || !password) return null;

        const email = parsed.data;
        const [row] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!row?.passwordHash) {
          // Timing pad + generic failure (no user enumeration)
          await dummyPasswordCheck(password);
          return null;
        }

        const ok = await verifyPasswordSecure(password, row.passwordHash);
        if (!ok) return null;

        return {
          id: row.id,
          email: row.email,
          name: row.name,
          image: row.image,
        };
      },
    }),
  ];

  if (hasAppleEnv()) {
    providers.push(
      Apple({
        clientId: process.env.AUTH_APPLE_ID!,
        clientSecret: process.env.AUTH_APPLE_SECRET!,
      })
    );
  }

  if (hasGoogleEnv()) {
    providers.push(
      Google({
        clientId: process.env.AUTH_GOOGLE_ID!,
        clientSecret: process.env.AUTH_GOOGLE_SECRET!,
        allowDangerousEmailAccountLinking: false,
      })
    );
  }

  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
    authenticatorsTable: authenticators,
  }),
  providers: buildProviders(),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14, // 14 days
    updateAge: 60 * 60 * 24, // refresh claim once/day
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-authjs.session-token"
          : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  trustHost: true,
  secret: requireAuthSecret(),
  pages: {
    signIn: "/auth",
    error: "/auth",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) token.sub = user.id;
      if (account?.provider === "apple" || account?.provider === "google") {
        token.provider = account.provider;
        token.providerAccountId = account.providerAccountId;
      }
      if (account?.provider === "credentials") {
        token.provider = "credentials";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (token.provider === "apple" || token.provider === "google") {
        session.provider = token.provider;
      }
      if (token.provider === "credentials") {
        session.provider = undefined;
      }
      if (typeof token.providerAccountId === "string") {
        session.providerAccountId = token.providerAccountId;
      }
      return session;
    },
  },
});
