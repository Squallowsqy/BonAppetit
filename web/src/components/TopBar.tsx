import Link from "next/link";

export function TopBar({
  trailing,
  wide,
}: {
  trailing?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <header
      className={`ba-material ba-hairline sticky top-0 z-40 ${
        wide ? "ba-shell-wide" : "ba-shell"
      } flex items-center justify-between py-3`}
    >
      <Link href="/" className="ba-press ba-title text-[1.35rem] text-[var(--basil)]">
        BonAppétit<span className="text-[var(--saffron)]">!</span>
      </Link>
      {trailing}
    </header>
  );
}
