import type { SavedGroceryList, GrocerySnapshotLine } from "@/lib/types";

export type ExportableList = {
  label: string;
  storeName?: string | null;
  totalEst?: number;
  lines: (GrocerySnapshotLine | {
    key: string;
    name: string;
    aisleLabel: string;
    qty: number;
    unit: string;
    estEUR: number | null;
  })[];
  checked?: Record<string, boolean>;
};

function fmtQty(qty: number) {
  return String(Math.round(qty * 10) / 10);
}

type AnyLine = ExportableList["lines"][number];

function sectionOf(line: AnyLine): string {
  return "sectionLabel" in line && line.sectionLabel ? line.sectionLabel : "";
}

function describe(item: AnyLine): string {
  const packs = "packs" in item && item.packs ? item.packs : 0;
  const packLabel = "packLabel" in item ? item.packLabel : null;
  const parts: string[] = [];
  if (packs) parts.push(`${packs} × ${packLabel || "pack"}`);
  if (item.qty) parts.push(`${fmtQty(item.qty)} ${item.unit}`);
  const shelf = "shelfDays" in item ? item.shelfDays : null;
  if (shelf != null && shelf <= 3) parts.push(`frais ${shelf} j`);
  const days = "useDays" in item ? item.useDays : undefined;
  if (days?.length) parts.push(days.join(", "));
  return parts.join(" · ");
}

export function groceryListToTxt(list: ExportableList) {
  const lines: string[] = [];
  lines.push(`BonAppétit! — ${list.label}`);
  if (list.storeName) lines.push(`Magasin : ${list.storeName}`);
  if (list.totalEst != null) {
    lines.push(`Estimation : ${list.totalEst.toFixed(2)} € (±10%)`);
  }
  lines.push("");

  // section → rayon → lignes (ordre d'arrivée = ordre de l'app)
  const bySection = new Map<string, Map<string, AnyLine[]>>();
  for (const line of list.lines) {
    const section = sectionOf(line);
    const aisle = "aisleLabel" in line ? line.aisleLabel : "Divers";
    const s = bySection.get(section) || new Map<string, AnyLine[]>();
    const arr = s.get(aisle) || [];
    arr.push(line);
    s.set(aisle, arr);
    bySection.set(section, s);
  }

  for (const [section, byAisle] of bySection) {
    if (section) {
      lines.push(`# ${section}`);
      lines.push("");
    }
    for (const [aisle, items] of byAisle) {
      lines.push(`## ${aisle}`);
      for (const item of items) {
        const done = list.checked?.[item.key] ? "[x]" : "[ ]";
        const price = item.estEUR != null ? ` — ${item.estEUR.toFixed(2)} €` : "";
        const desc = describe(item);
        lines.push(`${done} ${item.name}${desc ? ` — ${desc}` : ""}${price}`);
      }
      lines.push("");
    }
  }
  lines.push("Généré avec BonAppétit!");
  return lines.join("\n");
}

export function groceryListToCsv(list: ExportableList) {
  const rows = [
    [
      "section",
      "rayon",
      "produit",
      "conditionnements",
      "conditionnement",
      "quantite",
      "unite",
      "conservation_jours",
      "jours_utilisation",
      "estime_eur",
      "coche",
    ].join(";"),
  ];
  for (const item of list.lines) {
    const aisle = "aisleLabel" in item ? item.aisleLabel : "";
    rows.push(
      [
        csvEscape(sectionOf(item)),
        csvEscape(aisle),
        csvEscape(item.name),
        "packs" in item && item.packs ? String(item.packs) : "",
        csvEscape(("packLabel" in item && item.packLabel) || ""),
        fmtQty(item.qty),
        csvEscape(item.unit),
        "shelfDays" in item && item.shelfDays != null ? String(item.shelfDays) : "",
        csvEscape(("useDays" in item && item.useDays?.join(" ")) || ""),
        item.estEUR != null ? item.estEUR.toFixed(2) : "",
        list.checked?.[item.key] ? "1" : "0",
      ].join(";")
    );
  }
  return rows.join("\n");
}

function csvEscape(v: string) {
  if (/[;"\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugFile(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "liste-courses";
}

export function fromSaved(list: SavedGroceryList): ExportableList {
  return {
    label: list.label,
    storeName: list.storeName,
    totalEst: list.totalEst,
    lines: list.lines,
    checked: list.checked,
  };
}
