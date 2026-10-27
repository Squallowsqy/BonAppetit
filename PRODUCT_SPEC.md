# BonAppétit ! — Spec produit

Application de menus de dîners calés sur un **budget** et une **enseigne** (France), avec liste de courses, filtres allergies/régimes, et swap de plats.

## Positionnement

- Même parcours fonctionnel qu’un meal-planner budget moderne
- **100 % gratuit** — aucun abonnement, aucun paywall
- Marque : **BonAppétit !**
- Marché : France

## Funnel (gratuit de bout en bout)

1. Welcome
2. Store — magasin
3. Household — adultes / enfants (enfant ≈ 0,5 portion)
4. Spend — budget semaine
5. Dinners — nombre de dîners
6. Diet / Protein / Vibes
7. Allergens / Dislikes
8. Time / Skill / Equipment / Familiarity / Goal
9. Recap → Generation → Reveal (**accès libre**, pas de paiement) → App

## App

| Route | Rôle |
|-------|------|
| `/menu` | Semaine en cours |
| `/menu/recipes` | Fiches recettes |
| `/menu/groceries` | Liste de courses |
| `/menu/pantry` | Garde-manger |
| `/menu/favorites` | Favoris |
| `/menu/history` | Historique |
| `/menu/settings` | Préférences (pas de billing) |

## Données

- `profiles` — profil, avatar
- `week_plans` — plan de la semaine (JSON)
- `grocery_states` — cases cochées courses
- `user_recipes` — recettes perso
- `pantry` — garde-manger
- `favorites` — favoris
- `recipe_notes` — notes

Pas de table `entitlements` / abonnement.

## Tarification enseignes

`prix_ligne = priceEUR_pack × (qty/pack_qty) × priceCoefficient(enseigne)`

Affichage : estimation ±10 %.

## Stack cible

- Next.js App Router + TypeScript
- Supabase (Auth email optionnelle + Postgres)
- PostHog (analytics)
- Vercel
- i18n fr (en optionnel)

## Catalogue

Voir `data/CATALOGUE_BONAPPETIT.md`.
