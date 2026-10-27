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

export function groceryListToTxt(list: ExportableList) {
  const lines: string[] = [];
  lines.push(`BonAppétit! — ${list.label}`);
  if (list.storeName) lines.push(`Magasin : ${list.storeName}`);
  if (list.totalEst != null) {
    lines.push(`Estimation : ${list.totalEst.toFixed(2)} € (±10%)`);
  }
  lines.push("");

  const byAisle = new Map<string, ExportableList["lines"]>();
  for (const line of list.lines) {
    const aisle = "aisleLabel" in line ? line.aisleLabel : "Divers";
    const arr = byAisle.get(aisle) || [];
    arr.push(line);
    byAisle.set(aisle, arr);
  }

  for (const [aisle, items] of byAisle) {
    lines.push(`## ${aisle}`);
    for (const item of items) {
      const done = list.checked?.[item.key] ? "[x]" : "[ ]";
      const price =
        item.estEUR != null ? ` — ${item.estEUR.toFixed(2)} €` : "";
      lines.push(
        `${done} ${item.name} — ${fmtQty(item.qty)} ${item.unit}${price}`
      );
    }
    lines.push("");
  }
  lines.push("Généré avec BonAppétit!");
  return lines.join("\n");
}

export function groceryListToCsv(list: ExportableList) {
  const rows = [
    ["rayon", "produit", "quantite", "unite", "estime_eur", "coche"].join(";"),
  ];
  for (const item of list.lines) {
    const aisle = "aisleLabel" in item ? item.aisleLabel : "";
    rows.push(
      [
        csvEscape(aisle),
        csvEscape(item.name),
        fmtQty(item.qty),
        csvEscape(item.unit),
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
