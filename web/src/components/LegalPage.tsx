import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { TopBar } from "@/components/TopBar";

type Props = {
  title: string;
  children: React.ReactNode;
};

export function LegalPage({ title, children }: Props) {
  return (
    <main className="min-h-screen pb-8">
      <TopBar
        wide
        trailing={
          <Link href="/" className="ba-btn ba-btn-plain text-[0.95rem]">
            Accueil
          </Link>
        }
      />
      <article className="ba-shell-wide ba-legal-doc pt-6 pb-10">
        <p className="ba-caption uppercase tracking-[0.04em]">Informations légales</p>
        <h1 className="ba-title mt-1 text-[1.75rem]">{title}</h1>
        <div className="ba-legal-body mt-5">{children}</div>
      </article>
      <SiteFooter wide />
    </main>
  );
}
