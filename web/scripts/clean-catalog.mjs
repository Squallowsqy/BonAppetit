#!/usr/bin/env node
/**
 * Nettoyage du catalogue ingrédients / recettes.
 *
 * 1. Fusionne les doublons (`ba-ing-creme-epaisse` → `ing-cream`, etc.) : les
 *    recettes pointent vers l'id canonique, le libellé/quantité affichés restent
 *    ceux de la recette.
 * 2. Attribue un rayon à chaque ingrédient `unknown` (mots-clés).
 * 3. Donne un conditionnement + prix estimé à tout ingrédient qui n'en a pas
 *    (`estimated: true`), pour que la liste de courses soit chiffrée partout.
 * 4. Ajoute `shelf_days` (jours de conservation après achat, ouverture incluse).
 *
 * Idempotent : relançable sans effet de bord.
 *   node scripts/clean-catalog.mjs [--dry]
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const DATA = join(here, "..", "src", "data");
const DRY = process.argv.includes("--dry");

const read = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
const write = (f, v) => {
  if (DRY) return;
  writeFileSync(join(DATA, f), JSON.stringify(v), "utf8");
};

const ingredients = read("ingredients.json");
const recipes = read("recipes.json");
const featured = read("featured.json");

/* ------------------------------------------------------------------ */
/* 1. Alias → id canonique                                             */
/* ------------------------------------------------------------------ */

/**
 * alias → { to, unit? }  (unit = unité forcée sur la ligne recette, pour la
 * conversion ; ex. « tête d'ail » = 10 gousses).
 */
const ALIASES = {
  // Ail / aromates
  "ba-ing-gousse-d-ail": { to: "ing-garlic" },
  "ba-ing-tete-d-ail": { to: "ing-garlic", unit: "tête(s)" },
  "ba-ing-knoflookteen": { to: "ing-garlic" },
  "ba-ing-oignon-nouveau": { to: "ing-spring-onion" },
  "ba-ing-ciboule": { to: "ing-spring-onion" },
  "ba-ing-piment-rouge": { to: "ing-chili-fresh" },
  "ba-ing-piment-vert": { to: "ing-chili-fresh" },
  "ba-ing-piments-verts-turcs": { to: "ing-chili-fresh" },
  "ba-ing-piments-rouges-turcs": { to: "ing-chili-fresh" },
  "ba-ing-persil-plat": { to: "ing-parsley" },
  "ba-ing-basilic-thai": { to: "ing-basil" },
  "ba-ing-jeunes-pousses-d-epinards": { to: "ing-spinach-fresh" },
  "ba-ing-champignons-eminces": { to: "ing-mushroom" },
  "ba-ing-champignons-blonds": { to: "ing-mushroom" },
  "ba-ing-champignons-de-paris-eminces": { to: "ing-mushroom" },
  "ba-ing-fricassee-de-champignons-eminces": { to: "ing-mushroom" },
  "ba-ing-melange-de-champignons-predecoupes": { to: "ing-mushroom" },
  "ba-ing-grenailles": { to: "ing-potato" },
  "ba-ing-grenailles-rouges": { to: "ing-potato" },
  "ba-ing-krieltjes": { to: "ing-potato" },
  "ba-ing-pommes-de-terre-a-chair-ferme": { to: "ing-potato" },
  "ba-ing-pommes-de-terre-a-chair-farineuse": { to: "ing-potato" },
  "ba-ing-pommes-de-terre-a-chair-fondante": { to: "ing-potato" },
  "ba-ing-pommes-de-terre-roseval": { to: "ing-potato" },
  "ba-ing-salade-en-sachet": { to: "ing-salad-bag" },
  "ba-ing-melange-de-salades": { to: "ing-salad-bag" },
  "ba-ing-radicchio-roquette-et-laitue": { to: "ing-salad-bag" },
  "ba-ing-pousses-d-epinard-et-chicoree-rouge": { to: "ing-salad-bag" },
  "ba-ing-laitue": { to: "ing-lettuce" },
  "ba-ing-laitue-iceberg": { to: "ing-lettuce" },
  "ba-ing-salade-iceberg": { to: "ing-lettuce" },
  "ba-ing-salade-romaine": { to: "ing-lettuce" },
  "ba-ing-sucrine": { to: "ing-lettuce" },
  "ba-ing-mache": { to: "ing-salad-bag" },
  "ba-ing-cresson-de-roquette": { to: "ing-arugula" },
  "ba-ing-tomates-cerises-rouges-et-jaunes": { to: "ing-cherry-tomato" },
  "ba-ing-mini-tomates-roma": { to: "ing-cherry-tomato" },
  "ba-ing-des-de-butternut": { to: "ing-butternut" },
  "ba-ing-des-de-potiron": { to: "ing-butternut" },
  "ba-ing-des-de-potimarron": { to: "ing-butternut" },
  "ba-ing-potiron-tranche": { to: "ing-butternut" },
  "ba-ing-potimarron": { to: "ing-butternut" },
  "ba-ing-courge-hokkaido": { to: "ing-butternut" },
  "ba-ing-brocoli-fleurettes": { to: "ing-broccoli" },
  "ba-ing-broccolini": { to: "ing-broccoli" },
  "ba-ing-bimi": { to: "ing-broccoli" },
  "ba-ing-haricots-plats": { to: "ing-green-beans" },
  "ba-ing-haricots-plats-coupes": { to: "ing-green-beans" },
  "ba-ing-pois-mange-tout": { to: "ing-snow-peas" },
  "ba-ing-asperges-blanches": { to: "ing-asparagus" },
  "ba-ing-betteraves-rouges-cuites": { to: "ing-beetroot" },
  "ba-ing-celeri-rave": { to: "ing-celery" },
  "ba-ing-des-de-celeri-rave": { to: "ing-celery" },
  "ba-ing-celeri-vert": { to: "ing-celery" },
  "ba-ing-carottes-en-botte": { to: "ing-carrot" },
  "ba-ing-andive-decoupee": { to: "ing-endive" },
  "ba-ing-chou-blanc-et-carotte-rapes": { to: "ing-white-cabbage" },
  "ba-ing-chou-rouge-et-carotte-rapes": { to: "ing-red-cabbage" },
  "ba-ing-melange-de-carotte-et-choux": { to: "ing-white-cabbage" },
  "ba-ing-melange-de-carotte-chou-rouge-et-blanc": { to: "ing-white-cabbage" },
  "ba-ing-batonnets-de-poivron": { to: "ing-bell-pepper" },
  "ba-ing-jalapenos-coupes": { to: "ing-pickled-jalapenos" },
  "ba-ing-poivrons-grilles": { to: "ing-roasted-peppers" },
  "ba-ing-artichauts-marines": { to: "ing-artichoke-hearts" },
  "ba-ing-tomates-semi-sechees": { to: "ing-sun-dried-tomatoes" },
  "ba-ing-tomates-rouges-et-jaunes-semi-sechees": { to: "ing-sun-dried-tomatoes" },
  // Œufs & laitages
  "ba-ing-uf": { to: "ing-eggs" },
  "ba-ing-uf-de-poule-elevee-en-plein-air": { to: "ing-eggs" },
  "ba-ing-creme-epaisse": { to: "ing-cream" },
  "ba-ing-creme-aigre": { to: "ing-cream" },
  "ba-ing-creme-de-cuisson": { to: "ing-cooking-cream" },
  "ba-ing-creme-d-avoine": { to: "ing-cooking-cream" },
  "ba-ing-avoine-cuisine": { to: "ing-cooking-cream" },
  "ba-ing-yaourt-a-la-grecque": { to: "ing-greek-yogurt" },
  "ba-ing-yaourt-entier": { to: "ing-greek-yogurt" },
  "ba-ing-yaourt-nature": { to: "ing-greek-yogurt" },
  "ba-ing-yaourt-leger": { to: "ing-greek-yogurt" },
  "ba-ing-yaourt-au-lait-de-bufflonne": { to: "ing-greek-yogurt" },
  "ba-ing-fromage-blanc": { to: "ing-skyr" },
  "ba-ing-labneh": { to: "ing-greek-yogurt" },
  "ba-ing-lebne": { to: "ing-greek-yogurt" },
  "ba-ing-fromage-rape-a-l-italienne": { to: "ing-parmesan" },
  "ba-ing-parmigiano-reggiano-aop": { to: "ing-parmesan" },
  "ba-ing-parmigiano-reggiano-aop-rape": { to: "ing-parmesan" },
  "ba-ing-copeaux-de-grana-padano-aop": { to: "ing-parmesan" },
  "ba-ing-copeaux-de-grana-padano": { to: "ing-parmesan" },
  "ba-ing-grana-padano-rape": { to: "ing-parmesan" },
  "ba-ing-fromage-italien-rape": { to: "ing-parmesan" },
  "ba-ing-pecorino-rape": { to: "ing-parmesan" },
  "ba-ing-pecorino-aop-rape": { to: "ing-parmesan" },
  "ba-ing-gouda-rape": { to: "ing-grated-cheese" },
  "ba-ing-gouda-vieux-rape": { to: "ing-grated-cheese" },
  "ba-ing-gouda-mi-vieux-rape": { to: "ing-grated-cheese" },
  "ba-ing-copeaux-de-gouda-vieux": { to: "ing-grated-cheese" },
  "ba-ing-tomme-rapee": { to: "ing-grated-cheese" },
  "ba-ing-fromage-de-montagne-rape": { to: "ing-grated-cheese" },
  "ba-ing-fromage-fondu": { to: "ing-grated-cheese" },
  "ba-ing-fromage-a-la-grecque": { to: "ing-feta" },
  "ba-ing-fromage-bleu": { to: "ing-blue-cheese" },
  "ba-ing-fourme-d-ambert-aop": { to: "ing-blue-cheese" },
  "ba-ing-bleu-d-auvergne-aop": { to: "ing-blue-cheese" },
  "ba-ing-fromage-a-raclette": { to: "ing-reblochon" },
  "ba-ing-raclette-classique-richesmonts": { to: "ing-reblochon" },
  "ba-ing-fromage-a-tartiflette": { to: "ing-reblochon" },
  "ba-ing-fromage-frais": { to: "ing-cottage-cheese" },
  "ba-ing-panir": { to: "ing-paneer" },
  "ba-ing-tofu-nature": { to: "ing-tofu" },
  "ba-ing-tofu-peu-epice-en-des": { to: "ing-tofu" },
  "ba-ing-eminces-veggie-facon-poulet": { to: "ing-seitan" },
  "ba-ing-eminces-vegetariens": { to: "ing-seitan" },
  "ba-ing-steak-vegetal": { to: "ing-tempeh" },
  "ba-ing-hache-vegetal": { to: "ing-tempeh" },
  "ba-ing-lardons-vegetaux": { to: "ing-smoked-tofu" },
  "ba-ing-tortelloni-ricotta-epinards": { to: "ing-tortellini" },
  "ba-ing-tortelloni-aux-champignons": { to: "ing-tortellini" },
  "ba-ing-pate-a-tarte": { to: "ing-shortcrust-pastry" },
  "ba-ing-pate-a-tarte-sans-gluten": { to: "ing-shortcrust-pastry" },
  "ba-ing-pate-pour-flammekueche": { to: "ing-pizza-dough" },
  // Viandes
  "ba-ing-filet-de-poulet": { to: "ing-chicken-breast" },
  "ba-ing-filet-de-poulet-label-rouge": { to: "ing-chicken-breast" },
  "ba-ing-aiguillettes-de-poulet": { to: "ing-chicken-breast" },
  "ba-ing-eminces-de-filet-de-poulet-rotis": { to: "ing-chicken-breast" },
  "ba-ing-eminces-de-poulet-marines-a-la-japonaise": { to: "ing-chicken-breast" },
  "ba-ing-tranches-de-poulet-cuit": { to: "ing-chicken-breast" },
  "ba-ing-hauts-de-cuisses-de-poulet": { to: "ing-chicken-thigh" },
  "ba-ing-pilons-de-poulet": { to: "ing-chicken-thigh" },
  "ba-ing-pilons-de-poulet-marines-aux-herbes": { to: "ing-chicken-thigh" },
  "ba-ing-des-de-filet-de-dinde": { to: "ing-turkey-cutlet" },
  "ba-ing-eminces-de-dinde": { to: "ing-turkey-cutlet" },
  "ba-ing-viande-hachee-au-b-uf": { to: "ing-ground-beef" },
  "ba-ing-viande-hachee-de-b-uf-de-race": { to: "ing-ground-beef" },
  "ba-ing-viande-hachee-de-b-uf-et-de-porc": { to: "ing-ground-beef" },
  "ba-ing-viande-de-boeuf-hache-epicee": { to: "ing-ground-beef" },
  "ba-ing-boeuf-hache-aux-epices-orientales": { to: "ing-ground-beef" },
  "ba-ing-viande-hachee-de-b-uf-porc-et-veau-aux-herbes": { to: "ing-ground-beef" },
  "ba-ing-eminces-de-b-uf": { to: "ing-beef-steak" },
  "ba-ing-eminces-de-rumsteak": { to: "ing-beef-steak" },
  "ba-ing-rumsteak": { to: "ing-beef-steak" },
  "ba-ing-bavette-de-b-uf": { to: "ing-beef-steak" },
  "ba-ing-pave-de-b-uf-marine": { to: "ing-beef-steak" },
  "ba-ing-pave-de-b-uf-de-race": { to: "ing-beef-steak" },
  "ba-ing-pave-de-b-uf-charolais": { to: "ing-beef-steak" },
  "ba-ing-veau": { to: "ing-beef-stew" },
  "ba-ing-paupiette-de-veau": { to: "ing-pork-tenderloin" },
  "ba-ing-tranches-de-carre-de-porc": { to: "ing-pork-chop" },
  "ba-ing-echine-de-porc-desossee": { to: "ing-pork-shoulder" },
  "ba-ing-effiloche-de-porc": { to: "ing-pork-shoulder" },
  "ba-ing-eminces-de-porc-marines-a-la-mexicaine": { to: "ing-pork-tenderloin" },
  "ba-ing-des-de-filet-de-porc": { to: "ing-pork-tenderloin" },
  "ba-ing-medaillons-de-porc": { to: "ing-pork-tenderloin" },
  "ba-ing-saucisse-de-toulouse": { to: "ing-sausage" },
  "ba-ing-chipolata": { to: "ing-sausage" },
  "ba-ing-saucisse-aux-herbes": { to: "ing-sausage" },
  "ba-ing-saucisse-de-porc-marjolaine-et-ail": { to: "ing-sausage" },
  "ba-ing-saucisse-de-porc-citron-et-thym": { to: "ing-sausage" },
  "ba-ing-saucisse-de-porc-fumee": { to: "ing-sausage" },
  "ba-ing-chair-a-saucisse": { to: "ing-sausage" },
  "ba-ing-farce-au-porc": { to: "ing-sausage" },
  "ba-ing-poitrine-fumee": { to: "ing-lardons" },
  "ba-ing-tranches-de-poitrine-fumee": { to: "ing-lardons" },
  "ba-ing-lardons-fumes-sans-nitrite": { to: "ing-lardons" },
  "ba-ing-lard": { to: "ing-lardons" },
  "ba-ing-jambon-blanc-sans-nitrite": { to: "ing-ham" },
  "ba-ing-jambon-cobourg": { to: "ing-ham" },
  "ba-ing-jambon-sec": { to: "ing-cured-ham" },
  "ba-ing-jambon-serrano": { to: "ing-cured-ham" },
  "ba-ing-coppa": { to: "ing-cured-ham" },
  "ba-ing-prosciutto-crudo": { to: "ing-cured-ham" },
  "ba-ing-chiffonnade-de-speck": { to: "ing-cured-ham" },
  "ba-ing-filet-de-canard": { to: "ing-duck-breast" },
  "ba-ing-filet-de-canette": { to: "ing-duck-breast" },
  // Poissons
  "ba-ing-filet-de-saumon-avec-peau": { to: "ing-salmon" },
  "ba-ing-filet-de-lieu-noir": { to: "ing-white-fish" },
  "ba-ing-filet-de-merlu-avec-peau": { to: "ing-white-fish" },
  "ba-ing-filet-de-cabillaud-sans-peau": { to: "ing-cod" },
  "ba-ing-filet-d-eglefin": { to: "ing-white-fish" },
  "ba-ing-filet-d-eglefin-sans-peau": { to: "ing-white-fish" },
  "ba-ing-filet-de-pangasius": { to: "ing-white-fish" },
  "ba-ing-filet-de-perche-du-nil-sans-peau": { to: "ing-white-fish" },
  "ba-ing-filet-de-barramundi": { to: "ing-white-fish" },
  "ba-ing-filet-de-bar-avec-peau": { to: "ing-white-fish" },
  "ba-ing-filet-de-dorade-avec-peau": { to: "ing-white-fish" },
  "ba-ing-filet-de-truite-avec-peau": { to: "ing-trout" },
  "ba-ing-melange-de-poissons-saumon-cabillaud-lieu-noir": { to: "ing-white-fish" },
  "ba-ing-grosses-crevettes": { to: "ing-shrimp" },
  "ba-ing-crevette-nordique": { to: "ing-shrimp" },
  "ba-ing-miettes-de-saumon-fume-a-chaud": { to: "ing-smoked-salmon" },
  "ba-ing-filet-de-truite-fumee-a-chaud": { to: "ing-smoked-salmon" },
  // Boulangerie
  "ba-ing-pain-burger": { to: "ing-burger-buns" },
  "ba-ing-pain-burger-aux-graines": { to: "ing-burger-buns" },
  "ba-ing-pain-burger-brioche-graines": { to: "ing-burger-buns" },
  "ba-ing-pain-burger-au-sesame": { to: "ing-burger-buns" },
  "ba-ing-mini-pain-a-hamburger-complet": { to: "ing-burger-buns" },
  "ba-ing-pain-a-hot-dog": { to: "ing-burger-buns" },
  "ba-ing-pain-naan": { to: "ing-naan" },
  "ba-ing-pain-naan-a-l-ail-et-aux-epices": { to: "ing-naan" },
  "ba-ing-pain-pita": { to: "ing-pita" },
  "ba-ing-pain-pita-complet": { to: "ing-pita" },
  "ba-ing-pain-libanais": { to: "ing-pita" },
  "ba-ing-pain-libanais-complet": { to: "ing-pita" },
  "ba-ing-pain-plat-libanais": { to: "ing-pita" },
  "ba-ing-pain-turc": { to: "ing-pita" },
  "ba-ing-mini-tortillas": { to: "ing-tortillas" },
  "ba-ing-tortillas-au-ble-complet": { to: "ing-tortillas" },
  "ba-ing-mini-tortillas-au-ble-complet": { to: "ing-tortillas" },
  "ba-ing-tortillas-old-el-pasotm": { to: "ing-tortillas" },
  "ba-ing-tacos": { to: "ing-tortillas" },
  "ba-ing-pain-de-mie": { to: "ing-bread" },
  "ba-ing-pain-au-levain": { to: "ing-bread" },
  "ba-ing-petite-baguette-a-l-epeautre": { to: "ing-baguette" },
  "ba-ing-focaccia": { to: "ing-ciabatta" },
  // Épicerie sèche
  "ba-ing-linguine": { to: "ing-spaghetti" },
  "ba-ing-rigatoni": { to: "ing-penne" },
  "ba-ing-conchiglie": { to: "ing-penne" },
  "ba-ing-farfalle": { to: "ing-penne" },
  "ba-ing-farfalle-tricolores": { to: "ing-penne" },
  "ba-ing-casarecce": { to: "ing-penne" },
  "ba-ing-orecchiette": { to: "ing-penne" },
  "ba-ing-macaroni": { to: "ing-macaroni" },
  "ba-ing-fusilli-complets": { to: "ing-penne" },
  "ba-ing-fusilli-a-cuisson-rapide": { to: "ing-penne" },
  "ba-ing-pates": { to: "ing-penne" },
  "ba-ing-riz-pour-risotto": { to: "ing-arborio-rice" },
  "ba-ing-riz-au-jasmin": { to: "ing-rice" },
  "ba-ing-riz-pandan": { to: "ing-rice" },
  "ba-ing-riz-au-pandan": { to: "ing-rice" },
  "ba-ing-riz-long-grain": { to: "ing-rice" },
  "ba-ing-riz-du-surinam": { to: "ing-rice" },
  "ba-ing-riz-cargo": { to: "ing-rice" },
  "ba-ing-riz-precuit": { to: "ing-rice" },
  "ba-ing-riz-complet-precuit": { to: "ing-rice" },
  "ba-ing-semoule-complete": { to: "ing-couscous" },
  "ba-ing-nouilles-de-ble": { to: "ing-egg-noodles" },
  "ba-ing-nouilles-plates-de-riz": { to: "ing-rice-noodles" },
  "ba-ing-cassonade": { to: "ing-sugar" },
  "ba-ing-noix-concassees": { to: "ing-walnuts" },
  "ba-ing-noix-de-cajou-concassees": { to: "ing-cashews" },
  "ba-ing-cacahuetes-non-salees": { to: "ing-peanuts" },
  "ba-ing-cacahuetes-salees": { to: "ing-peanuts" },
  "ba-ing-cacahuetes-salees-avec-peau": { to: "ing-peanuts" },
  "ba-ing-noisettes": { to: "ing-hazelnuts" },
  "ba-ing-noisettes-grillees": { to: "ing-hazelnuts" },
  "ba-ing-amandes-grillees-non-salees": { to: "ing-almonds" },
  "ba-ing-amandes-entieres-grillees-salees": { to: "ing-almonds" },
  "ba-ing-amandes-entieres-grillees-non-salees": { to: "ing-almonds" },
  "ba-ing-poudre-d-amandes": { to: "ing-almonds" },
  "ba-ing-raisins-secs-sultanines": { to: "ing-raisins" },
  "ba-ing-abricots-seches": { to: "ing-dried-apricots" },
  "ba-ing-morceaux-de-dattes-sechees": { to: "ing-dates" },
  "ba-ing-graines-de-tournesol": { to: "ing-pumpkin-seeds" },
  "ba-ing-melange-de-graines-de-tournesol-et-de-courge": { to: "ing-pumpkin-seeds" },
  "ba-ing-chips-de-tortilla-epicees": { to: "ing-tortilla-chips" },
  "ba-ing-farine-d-epeautre": { to: "ing-flour" },
  "ba-ing-lentilles-precuites": { to: "ing-green-lentils" },
  // Conserves
  "ba-ing-mais-en-conserve": { to: "ing-corn" },
  "ba-ing-olives-kalamata": { to: "ing-olives-black" },
  "ba-ing-olives-kalamata-denoyautees": { to: "ing-olives-black" },
  "ba-ing-olives-leccino-denoyautees": { to: "ing-olives-black" },
  "ba-ing-olives-et-capres": { to: "ing-olives-black" },
  "ba-ing-tomates-cerises-en-conserve": { to: "ing-crushed-tomatoes" },
  "ba-ing-tomates-concassees-a-l-ail-et-a-l-oignon": { to: "ing-crushed-tomatoes" },
  // Condiments / épices
  "ba-ing-poivre-et-sel": { to: "ing-salt-pepper" },
  "ba-ing-peper-en-zout": { to: "ing-salt-pepper" },
  "ba-ing-mosterd": { to: "ing-mustard" },
  "ba-ing-vinaigre-de-vin-rouge-ou-de-cidre": { to: "ing-wine-vinegar" },
  "ba-ing-vinaigre-balsamique-blanc-ou-de-riz": { to: "ing-rice-vinegar" },
  "ba-ing-bouillon-de-legumes": { to: "ing-stock-cube" },
  "ba-ing-bouillon-de-volaille": { to: "ing-stock-cube" },
  "ba-ing-bouillon-de-b-uf": { to: "ing-stock-cube" },
  "ba-ing-bouillon-de-poisson": { to: "ing-stock-cube" },
  "ba-ing-cube-de-bouillon-de-b-uf": { to: "ing-stock-cube" },
  "ba-ing-cube-de-bouillon-de-champignons": { to: "ing-stock-cube" },
  "ba-ing-sauce-poisson": { to: "ing-fish-sauce" },
  "ba-ing-sauce-soja-reduite-en-sel": { to: "ing-soy-sauce" },
  "ba-ing-sauce-umami-a-l-huitre": { to: "ing-oyster-sauce" },
  "ba-ing-cumin-en-poudre": { to: "ing-cumin" },
  "ba-ing-paprika-en-poudre": { to: "ing-paprika" },
  "ba-ing-feuille-de-laurier": { to: "ing-bay-leaves" },
  "ba-ing-flocons-de-chili": { to: "ing-chili-flakes" },
  "ba-ing-thym-seche": { to: "ing-thyme-dried" },
  "ba-ing-romarin-seche": { to: "ing-thyme-dried" },
  "ba-ing-epices-italiennes": { to: "ing-italian-spices" },
  "ba-ing-epices-a-l-italienne": { to: "ing-italian-spices" },
  "ba-ing-pesto-vert-alla-genovese": { to: "ing-pesto" },
  "ba-ing-pesto-au-basilic-et-cajous": { to: "ing-pesto" },
  "ba-ing-sauce-au-chili-sucree-et-epicee": { to: "ing-sweet-chili" },
  "ba-ing-sauce-asiatique-sucree": { to: "ing-hoisin" },
  "ba-ing-sauce-chipotle-au-piment": { to: "ing-chipotle-adobo" },
  "ba-ing-sauce-zhoug-piment-coriandre": { to: "ing-harissa" },
  "ba-ing-sauce-zhoug-au-piment-coriandre": { to: "ing-harissa" },
  "ba-ing-sauce-bbq-facon-carolina-gold": { to: "ing-bbq-sauce" },
  "ba-ing-sauce-teriyaki": { to: "ing-soy-sauce" },
  "ba-ing-miso-blanc": { to: "ing-miso" },
  "ba-ing-zaatar": { to: "ing-zaatar" },
  "ba-ing-huile-pimentee-croustillante": { to: "ing-sriracha" },
  "ba-ing-pate-epicee-tikka-masala": { to: "ing-curry-paste" },
  "ba-ing-pate-epicee-javanaise": { to: "ing-curry-paste" },
  "ba-ing-pate-epicee-balinaise": { to: "ing-curry-paste" },
  "ba-ing-pate-epicee-jamaicaine": { to: "ing-curry-paste" },
  "ba-ing-pate-de-condiments-thais-pour-wok": { to: "ing-curry-paste" },
  "ba-ing-curry-jaune": { to: "ing-curry-powder" },
  "ba-ing-eau": { to: null }, // supprimé : pas un achat
  "ba-ing-ginger-shot": { to: "ing-ginger" },
  "ba-ing-puree-de-gingembre": { to: "ing-ginger" },
  "ba-ing-tapenade-d-olives-noires": { to: "ing-olives-black" },
  "ba-ing-confiture-de-fraises": { to: "ing-fig-jam" },
  "ba-ing-feve-de-soja": { to: "ing-edamame" },
  "ba-ing-petits-pois-en-conserve": { to: "ing-frozen-peas" },
  "ba-ing-noix-de-coco-rapee": { to: "ing-almonds" },
  "ba-ing-tomme-montagnarde": { to: "ing-grated-cheese" },
  "ba-ing-tomme-de-montagne": { to: "ing-grated-cheese" },
  "ba-ing-couscous-perle": { to: "ing-orzo" },
  "ba-ing-ravioli-chou-fleur-et-beurre-noisette": { to: "ing-tortellini" },
  "ba-ing-ravioles-du-dauphine-au-comte": { to: "ing-tortellini" },
  "ba-ing-ravioli-nduja-poivrons": { to: "ing-tortellini" },
  "ba-ing-girasoli-tomate-mozzarella": { to: "ing-tortellini" },
  "ba-ing-girasoli-courge-sauge": { to: "ing-tortellini" },
  "ba-ing-gomasio-aux-herbes-de-provence": { to: "ing-gomasio" },
  "ba-ing-melange-de-legumes-decoupes": { to: "ing-mixed-veg" },
  "ba-ing-melange-de-legumes-asiatiques": { to: "ing-mixed-veg" },
  "ba-ing-melange-de-legumes": { to: "ing-mixed-veg" },
  "ba-ing-melange-de-legumes-hollandais": { to: "ing-mixed-veg" },
  "ba-ing-melange-de-legumes-a-l-orientale": { to: "ing-mixed-veg" },
  "ba-ing-melange-de-poivron-carotte-chou-et-poireau": { to: "ing-mixed-veg" },
  "ba-ing-melange-de-poivrons-rouges-courgettes-poireaux-et-car": { to: "ing-mixed-veg" },
  "ba-ing-melange-de-champignons-blonds-poireaux-brocoli-et-cou": { to: "ing-mixed-veg" },
};

/** Ingrédients canoniques ajoutés (cibles d'alias absentes du catalogue). */
const NEW_CANONICAL = [
  { id: "ing-salt-pepper", name_fr: "Sel & poivre", unit: "g", aisle: "condiments", pack_qty: 1, price_eur: 0, staple: true },
  { id: "ing-salad-bag", name_fr: "Salade en sachet", unit: "sachet(s)", aisle: "produce", pack_qty: 1, price_eur: 1.6, pack_grams: 150 },
  { id: "ing-chili-fresh", name_fr: "Piment frais", unit: "unit", aisle: "produce", pack_qty: 3, price_eur: 1.2 },
  { id: "ing-cured-ham", name_fr: "Jambon cru", unit: "g", aisle: "meat", pack_qty: 100, price_eur: 2.9 },
  { id: "ing-hazelnuts", name_fr: "Noisettes", unit: "g", aisle: "dry", pack_qty: 125, price_eur: 2.4 },
  { id: "ing-thyme-dried", name_fr: "Herbes séchées (thym, romarin)", unit: "g", aisle: "condiments", pack_qty: 20, price_eur: 1.4 },
  { id: "ing-italian-spices", name_fr: "Mélange d'épices italiennes", unit: "g", aisle: "condiments", pack_qty: 30, price_eur: 1.6 },
  { id: "ing-gomasio", name_fr: "Gomasio", unit: "g", aisle: "condiments", pack_qty: 100, price_eur: 2.4 },
  { id: "ing-mixed-veg", name_fr: "Mélange de légumes frais découpés", unit: "g", aisle: "produce", pack_qty: 400, price_eur: 2.6 },
];

/* ------------------------------------------------------------------ */
/* 2. Rayon par mots-clés (pour les `unknown` restants)                */
/* ------------------------------------------------------------------ */

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const HERBS = /persil|coriandre|menthe|basilic|aneth|ciboulette|cerfeuil|estragon|sauge|ail des ours|cresson/;
const DRIED = /moulu|seche|sechee|en poudre|lyophilis/;

const AISLE_RULES = [
  ["frozen", /surgel/],
  // Traiteur / plats préparés (rayon frais)
  ["dairy", /nems|samossas|assortiment|mezzes|rillettes|korma|tourte|lasagne a la|vol-au-vent|pommes dauphine|nuggets|boulettes thai|poisson pane|energy balls|tiramisu|fondant|trianon|coulant|blinis|crepes|brulee|creme de basilic/],
  ["canned", /en conserve|boite|bocal|conserve/],
  ["bakery", /\bpain|bagel|brioche|naan|pita|tortilla|tacos|baguette|focaccia|pinsa|galette|\bbao\b|hot-dog|burger/],
  ["condiments", /sauce|epice|pesto|aioli|ketchup|moutarde|chutney|miso|gomasio|zaatar|baharat|vadouvan|curry|piri|thym seche|romarin seche|moulu|puree de gingembre|pate epicee|huile|vinaigre|bouillon|miel|melasse|\bsel\b|poivre|tapenade|sirop|confiture|assaisonnement|oignons frits|flocons de chili|graine de carvi|graines de moutarde|anis|laurier|worcestershire|hollandaise|quatre epices|melange d epices|cumin|paprika/],
  ["fish", /saumon|cabillaud|lieu|merlu|crevette|poisson|truite|\bbar\b|dorade|haddock|maquereau|eglefin|pangasius|barramundi|perche|moule|saint-jacques|nordique|thon/],
  ["meat", /poulet|dinde|boeuf|b uf|porc|veau|agneau|saucisse|chipolata|lardon|poitrine|jambon|coppa|prosciutto|speck|chorizo|canard|canette|pintade|boudin|rumsteak|bavette|pave|hache|merguez|\blard\b|serrano|cobourg|confit|pilons|cuisses|medaillons|echine|paupiette|farce|boulettes|foie gras/],
  ["dairy", /veggie|vegetal|vegetarien|falafel|houmous|guacamole|creme|fromage|yaourt|oeuf|\buf\b|lait|beurre|gouda|parmigiano|grana|pecorino|tomme|cantal|brie|comte|raclette|tartiflette|bleu|fourme|nectaire|ossau|labneh|lebne|skyr|mozzarella|burrata|mascarpone|ricotta|feta|halloumi|panir|fraiches|girasoli|tortelloni|ravioli|ravioles|gnocchi|tofu|pate a tarte|pate pour|feuille de brick|pont-l|sarasson|provolone|des de fromage/],
  ["dry", /linguine|rigatoni|conchiglie|farfalle|casarecce|orecchiette|macaroni|fusilli|pates|\briz\b|semoule|couscous|freekeh|\bble\b|nouilles|noix|noisette|cacahuete|amande|graines|cranberr|abricots sech|dattes|raisins sec|chips|muesli|flocons|farine|poudre|levure|preparation pour|pepites|speculoos|cassonade|sucre|lentilles|marrons|melange de haricots|melange cranberries|fraises lyophilisees|chocolat/],
  ["produce", /salade|oignon|piment|grenailles|pommes de terre|portobello|champignon|pleurote|sucrine|citronnelle|nectarine|melon|panais|chou|kiwi|pois|navet|myrtille|carotte|prune|potimarron|potiron|butternut|courge|asperge|haricots plats|epinard|mache|laitue|iceberg|romaine|roquette|radicchio|topinambour|celeri|ciboule|ananas|betterave|bimi|banane|peche|pasteque|fruit de la passion|ail|thym|romarin|origan|melange de legumes|des de|blettes|oseille|brocoli|poivron|tomate|jalape|gingembre|echalote|citron|avocat|concombre|courgette|aubergine|fenouil|endive|radis|mangue|grenade|pomme|orange/],
  ["beverages", /\beau\b|shot|vin\b|biere/],
];

function classifyAisle(name) {
  const n = norm(name);
  // Herbes fraîches avant tout (sinon « sauce », « frais », etc. les détournent)
  if (HERBS.test(n) && !DRIED.test(n) && !/sauce|pesto|creme|fromage|yaourt/.test(n)) {
    return "produce";
  }
  for (const [aisle, re] of AISLE_RULES) if (re.test(n)) return aisle;
  return "dry";
}

/* ------------------------------------------------------------------ */
/* 3. Conditionnement + prix par défaut (estimations)                  */
/* ------------------------------------------------------------------ */

const PACK_UNITS = /sachet|paquet|pot|boite|brique|botte|sac|barquette/;

function defaultPack(ing) {
  const u = norm(ing.unit);
  const a = ing.aisle;
  const isPack = PACK_UNITS.test(u);
  const isPiece = /piece|unit|tranche/.test(u);
  const table = {
    produce: { g: [500, 2.0], piece: [1, 1.0], pack: [1, 1.8, 150], ml: [500, 1.5] },
    meat: { g: [400, 5.5], piece: [1, 2.6, 150], pack: [1, 3.8, 300] },
    fish: { g: [300, 6.5], piece: [1, 3.5, 125], pack: [1, 5.0, 250] },
    dairy: { g: [200, 2.2], piece: [1, 2.4], pack: [1, 2.0, 200], ml: [200, 1.2] },
    bakery: { g: [400, 2.0], piece: [4, 2.2], pack: [1, 2.2, 300] },
    dry: { g: [500, 2.0], piece: [1, 1.5], pack: [1, 1.9, 100], ml: [500, 2.0] },
    canned: { g: [400, 1.2], piece: [1, 1.2], pack: [1, 1.5, 300], ml: [400, 1.3] },
    condiments: { g: [100, 2.0], piece: [1, 1.5], pack: [1, 1.3, 40], ml: [250, 2.5] },
    frozen: { g: [600, 2.5], piece: [1, 2.5], pack: [1, 2.8, 500] },
    beverages: { g: [500, 1.5], piece: [1, 1.5], pack: [1, 1.5, 500], ml: [500, 1.0] },
  };
  const row = table[a] || table.dry;
  let spec;
  if (isPack) spec = row.pack;
  else if (isPiece) spec = row.piece;
  else if (u === "ml" || u === "cl" || u === "l") spec = row.ml || row.g;
  else if (u === "cc" || u === "cs") spec = row.g; // épices en cuillères → grammes
  else spec = row.g;
  const [pack_qty, price_eur, pack_grams] = spec;
  const unit =
    u === "cc" || u === "cs" ? "g" : isPiece ? "unit" : ing.unit || "g";
  return { pack_qty, price_eur, unit, pack_grams: isPack ? pack_grams : undefined };
}

/* ------------------------------------------------------------------ */
/* 4. Durée de conservation (jours après achat, ouverture incluse)     */
/* ------------------------------------------------------------------ */

const SHELF_RULES = [
  [7, /creme de basilic|pesto|houmous|guacamole|tiramisu|fondant|trianon|coulant|blinis|crepes/],
  [2, /crevette|moule|saint-jacques|poisson|saumon|cabillaud|lieu|merlu|truite|\bbar\b|dorade|eglefin|pangasius|barramundi|perche|thon frais|steaks? de thon|hache|chair a saucisse|farce/],
  [3, /poulet|dinde|volaille|boeuf|b uf|porc|veau|agneau|canard|canette|saucisse|chipolata|merguez|boudin|pilons|cuisses|medaillons|echine|paupiette|rumsteak|bavette|pave|salade|laitue|sucrine|roquette|mache|cresson|basilic|coriandre|persil|menthe|aneth|ciboulette|estragon|cerfeuil|sauge|ail des ours|herbes fraiches|pain|baguette|ciabatta|focaccia|naan|pita|brioche|bagel|petit pain|pousses|epinards frais|champignon|pleurote|portobello/],
  [5, /fraiches|frais\b|gnocchi|tortellini|ravioli|ravioles|girasoli|tortelloni|pate a pizza|pate feuilletee|pate brisee|flammekueche|brick|avocat|framboise|myrtille|fraise|peche|nectarine|prune|melon|pasteque|mangue|kiwi|haricots verts|asperge|brocoli|bimi|pois gourmands|mange-tout|concombre|courgette|aubergine|poivron|tomate|fenouil|poireau|celeri branche|endive|radis|epinard|blettes|oseille|tofu|tempeh|seitan|falafel|houmous|guacamole|lardon|jambon blanc|burrata|mozzarella|ricotta|mascarpone|cottage|fromage frais|skyr|yaourt|creme|lait\b|smoked|fume/],
  [10, /fromage|feta|halloumi|paneer|panir|cheddar|comte|gouda|parmesan|grana|pecorino|tomme|cantal|brie|camembert|reblochon|raclette|bleu|roquefort|fourme|chevre|jambon cru|coppa|prosciutto|speck|chorizo|serrano|beurre|oeuf|\buf\b|citron|orange|pomme\b|grenade|gingembre|piment frais|oignon nouveau|ciboule|chou kale|choux de bruxelles|chou-fleur|chou\b|betterave|kimchi/],
  [21, /oignon|echalote|ail\b|carotte|pomme de terre|pommes de terre|grenailles|patate douce|butternut|courge|potimarron|potiron|celeri-rave|panais|navet|topinambour|chou rouge|chou blanc|citron vert/],
];

const AISLE_SHELF = {
  produce: 7,
  meat: 3,
  fish: 2,
  dairy: 7,
  bakery: 3,
  dry: 365,
  canned: 365,
  condiments: 180,
  frozen: 180,
  beverages: 365,
};

function shelfDays(ing) {
  if (["dry", "canned", "condiments", "frozen", "beverages"].includes(ing.aisle)) {
    return AISLE_SHELF[ing.aisle];
  }
  const n = norm(ing.name_fr);
  for (const [days, re] of SHELF_RULES) if (re.test(n)) return days;
  return AISLE_SHELF[ing.aisle] ?? 7;
}

/* ------------------------------------------------------------------ */
/* Exécution                                                           */
/* ------------------------------------------------------------------ */

const byId = new Map(ingredients.map((i) => [i.id, i]));
for (const n of NEW_CANONICAL) if (!byId.has(n.id)) byId.set(n.id, { ...n });

// Alias dont la cible n'existe pas → on garde l'alias (sécurité)
for (const [from, spec] of Object.entries(ALIASES)) {
  if (spec.to && !byId.has(spec.to)) {
    console.warn(`⚠︎ cible absente pour ${from} → ${spec.to}`);
    delete ALIASES[from];
  }
}

// Ids référencés par les recettes mais absents du catalogue → création
const lineUnits = new Map();
const lineNames = new Map();
for (const r of [...recipes, ...featured]) {
  for (const l of r.ingredients || []) {
    const id = l.ingredientId;
    if (!lineUnits.has(id)) lineUnits.set(id, new Map());
    const m = lineUnits.get(id);
    m.set(l.unit || "", (m.get(l.unit || "") || 0) + 1);
    if (l.name_fr && !lineNames.has(id)) lineNames.set(id, l.name_fr);
  }
}
let created = 0;
for (const id of lineUnits.keys()) {
  if (byId.has(id) || id in ALIASES) continue;
  const units = [...lineUnits.get(id).entries()].sort((a, b) => b[1] - a[1]);
  const unit = units[0]?.[0] || "g";
  byId.set(id, {
    id,
    name_fr: lineNames.get(id) || id.replace(/^ba-ing-/, "").replace(/-/g, " "),
    unit,
    aisle: "unknown",
    pack_qty: null,
    price_eur: null,
  });
  created += 1;
}

// Rayons + packs + shelf
let reclassified = 0;
let priced = 0;
for (const ing of byId.values()) {
  if (ing.aisle === "unknown" || !ing.aisle) {
    ing.aisle = classifyAisle(ing.name_fr);
    reclassified += 1;
  }
  if (!ing.staple && (!ing.pack_qty || ing.price_eur == null)) {
    const d = defaultPack(ing);
    ing.pack_qty = d.pack_qty;
    ing.price_eur = d.price_eur;
    ing.unit = d.unit;
    if (d.pack_grams) ing.pack_grams = d.pack_grams;
    ing.estimated = true;
    priced += 1;
  }
  ing.shelf_days = shelfDays(ing);
}

// Suppression des alias du catalogue
let removed = 0;
for (const from of Object.keys(ALIASES)) {
  if (byId.delete(from)) removed += 1;
}

/**
 * Erreurs d'appariement de la source (libellé ↔ id) : on corrige d'après le
 * libellé de la ligne, qui est ce que le cuisinier lit.
 */
const NAME_OVERRIDES = {
  riz: "ing-rice",
  "pommes de terre": "ing-potato",
  "pomme de terre": "ing-potato",
  lait: "ing-milk",
  "chair de tomates": "ing-crushed-tomatoes",
};

// Réécriture des recettes
let rewrittenLines = 0;
let droppedLines = 0;
let nameFixed = 0;
function rewriteRecipe(r) {
  const out = [];
  for (const l of r.ingredients || []) {
    const override = NAME_OVERRIDES[norm(l.name_fr)];
    if (override && l.ingredientId !== override && byId.has(override)) {
      l.ingredientId = override;
      nameFixed += 1;
    }
    const spec = ALIASES[l.ingredientId];
    if (!spec) {
      out.push(l);
      continue;
    }
    if (spec.to === null) {
      droppedLines += 1;
      continue;
    }
    rewrittenLines += 1;
    out.push({
      ...l,
      ingredientId: spec.to,
      unit: spec.unit || l.unit,
    });
  }
  r.ingredients = out;
}
recipes.forEach(rewriteRecipe);
featured.forEach(rewriteRecipe);

const cleaned = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));

write("ingredients.json", cleaned);
write("recipes.json", recipes);
write("featured.json", featured);

const aisles = {};
for (const i of cleaned) aisles[i.aisle] = (aisles[i.aisle] || 0) + 1;
console.log(
  JSON.stringify(
    {
      dry: DRY,
      ingredients_before: ingredients.length,
      ingredients_after: cleaned.length,
      created,
      removed_aliases: removed,
      reclassified,
      priced_estimated: priced,
      recipe_lines_rewritten: rewrittenLines,
      recipe_lines_dropped: droppedLines,
      recipe_lines_name_fixed: nameFixed,
      aisles,
    },
    null,
    2
  )
);
