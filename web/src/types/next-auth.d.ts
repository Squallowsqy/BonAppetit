import type { DefaultSession } from "next-auth";
import type { OAuthProviderId } from "@/lib/oauth-types";

declare module "next-auth" {
  interface Session {
    provider?: OAuthProviderId;
    providerAccountId?: string;
    user: DefaultSession["user"] & {
      id?: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    provider?: OAuthProviderId | "credentials";
    providerAccountId?: string;
  }
}
