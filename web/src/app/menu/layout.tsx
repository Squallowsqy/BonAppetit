import { AccountChip } from "@/components/AccountChip";
import { TabBar } from "@/components/TabBar";
import { TopBar } from "@/components/TopBar";

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-[calc(5.5rem+var(--safe-bottom))]">
      <TopBar trailing={<AccountChip />} />
      <div className="ba-shell pt-2">{children}</div>
      <TabBar />
    </div>
  );
}
