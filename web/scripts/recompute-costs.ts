/**
 * Recalcule `costBase` / `costCoverage` de chaque recette à partir du catalogue
 * nettoyé et de la conversion d'unités (même logique que l'app).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/recompute-costs.ts
 *
 * À lancer après `scripts/clean-catalog.mjs`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { recipeBaseCost } from "@/lib/pricing";
import type { Recipe } from "@/lib/types";

const here = dirname(fileURLToPath(import.meta.url));
const DATA = join(here, "..", "src", "data");

for (const file of ["recipes.json", "featured.json"]) {
  const path = join(DATA, file);
  const recipes = JSON.parse(readFileSync(path, "utf8")) as Recipe[];
  let changed = 0;
  const costs: number[] = [];
  for (const r of recipes) {
    const { cost, coverage } = recipeBaseCost(r);
    if (r.costBase !== cost || r.costCoverage !== coverage) changed += 1;
    r.costBase = cost;
    r.costCoverage = coverage;
    costs.push(cost);
  }
  costs.sort((a, b) => a - b);
  writeFileSync(path, JSON.stringify(recipes), "utf8");
  console.log(
    `${file}: ${recipes.length} recettes, ${changed} modifiées · coût base min ${costs[0]} / médian ${
      costs[Math.floor(costs.length / 2)]
    } / max ${costs[costs.length - 1]}`
  );
}
