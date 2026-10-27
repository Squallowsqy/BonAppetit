import Link from "next/link";

const NAV = [
  { href: "/menu", label: "Semaine" },
  { href: "/menu/groceries", label: "Courses" },
  { href: "/menu/recipes", label: "Recettes" },
  { href: "/menu/favorites", label: "Favoris" },
  { href: "/menu/settings", label: "Réglages" },
];

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-24">
      <header className="ba-shell flex items-center justify-between py-5">
        <Link href="/" className="font-display text-xl text-[var(--basil)]">
          BonAppétit<span className="text-[var(--saffron)]">!</span>
        </Link>
        <Link href="/quiz" className="text-sm font-semibold text-[var(--basil-deep)]">
          Nouveau menu
        </Link>
      </header>
      <div className="ba-shell">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur">
        <ul className="ba-shell flex justify-between gap-1 py-3 text-xs font-semibold">
          {NAV.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="rounded-full px-2 py-2 text-[var(--ink)]/70 hover:text-[var(--basil)]"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
