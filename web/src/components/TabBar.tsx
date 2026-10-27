"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFunnelStore } from "@/lib/funnel-store";
import { planHorizon } from "@/lib/plan-labels";

export function TabBar() {
  const pathname = usePathname();
  const plan = useFunnelStore((s) => s.plan);
  const menuLabel = planHorizon(plan) === "month" ? "Mois" : "Semaine";

  const nav = [
    { href: "/menu", label: menuLabel, icon: "☰" },
    { href: "/menu/groceries", label: "Courses", icon: "✓" },
    { href: "/menu/recipes", label: "Recettes", icon: "◎" },
    { href: "/menu/favorites", label: "Favoris", icon: "★" },
    { href: "/menu/settings", label: "Réglages", icon: "⚙" },
  ];

  return (
    <nav className="ba-material-thick fixed inset-x-0 bottom-0 z-40 border-t border-[var(--separator)] pb-[var(--safe-bottom)]">
      <ul className="ba-shell flex items-stretch justify-between gap-1 px-1 pt-1.5 pb-2">
        {nav.map((item) => {
          const active =
            item.href === "/menu"
              ? pathname === "/menu"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className="ba-press flex flex-col items-center gap-0.5 rounded-lg py-1"
                style={{ color: active ? "var(--basil)" : "var(--secondary-label)" }}
              >
                <span className="text-[1.05rem] leading-none opacity-90" aria-hidden>
                  {item.icon}
                </span>
                <span className="max-w-full truncate px-0.5 text-[10px] font-semibold tracking-[-0.01em]">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
