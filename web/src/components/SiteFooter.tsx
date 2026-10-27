import Link from "next/link";

const LEGAL_LINKS = [
  { href: "/legal/mentions", label: "Mentions légales" },
  { href: "/legal/cgv", label: "CGV" },
  { href: "/legal/conditions", label: "Conditions d'utilisation" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/legal/cookies", label: "Cookies" },
] as const;

export function SiteFooter({ wide = false }: { wide?: boolean }) {
  return (
    <footer
      className={`${wide ? "ba-shell-wide" : "ba-shell"} border-t border-[var(--separator)] py-8`}
    >
      <p className="ba-title text-[1.1rem] text-[var(--basil)]">
        BonAppétit<span className="text-[var(--saffron)]">!</span>
      </p>
      <p className="ba-footnote mt-1">100% gratuit · France</p>

      <p className="ba-caption mt-5 px-0 uppercase tracking-[0.04em]">
        Mentions légales
      </p>
      <nav aria-label="Mentions légales" className="ba-legal-nav mt-2">
        {LEGAL_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="ba-legal-link">
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
