"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import type { OAuthProviderId } from "@/lib/oauth-types";

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.02-.8.87-2.1 1.54-3.2 1.45-.14-1.1.4-2.27 1.16-3.08.8-.9 2.2-1.55 3.22-1.39zM20.9 17.4c-.55 1.26-.82 1.82-1.53 2.93-.99 1.55-2.38 3.48-4.11 3.5-1.54.02-1.94-.98-4.04-.97-2.1.01-2.54.99-4.08.97-1.73-.02-3.05-1.76-4.04-3.3C1.4 17.3.2 12.66 2.4 9.5c1.1-1.6 2.84-2.61 4.5-2.61 1.68 0 2.73 1 4.12 1 1.34 0 2.16-1.01 4.1-1.01 1.46 0 3 .79 4.1 2.15-3.6 1.97-3.02 7.1.68 8.37z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.86c2.26-2.08 3.58-5.14 3.58-8.64z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.11A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.61H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l3.99-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.43-3.43C17.94 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.28 6.61l3.99 3.11C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

type Props = {
  callbackUrl: string;
  busy?: boolean;
  onBusy?: (busy: boolean) => void;
};

export function OAuthButtons({ callbackUrl, busy, onBusy }: Props) {
  const [providers, setProviders] = useState<OAuthProviderId[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/providers-public")
      .then((r) => r.json())
      .then((data: { providers?: OAuthProviderId[] }) => {
        if (!cancelled) setProviders(data.providers ?? []);
      })
      .catch(() => {
        if (!cancelled) setProviders([]);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded || providers.length === 0) return null;

  async function start(provider: OAuthProviderId) {
    onBusy?.(true);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      onBusy?.(false);
    }
  }

  return (
    <div className="mt-5 flex flex-col gap-2.5">
      {providers.includes("apple") ? (
        <button
          type="button"
          disabled={busy}
          className="ba-btn ba-btn-apple w-full"
          onClick={() => start("apple")}
        >
          <AppleIcon />
          Continuer avec Apple
        </button>
      ) : null}
      {providers.includes("google") ? (
        <button
          type="button"
          disabled={busy}
          className="ba-btn ba-btn-google w-full"
          onClick={() => start("google")}
        >
          <GoogleIcon />
          Continuer avec Google
        </button>
      ) : null}
      <div className="ba-oauth-divider" role="separator">
        <span>ou</span>
      </div>
    </div>
  );
}
