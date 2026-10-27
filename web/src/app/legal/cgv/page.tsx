import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "CGV · BonAppétit !",
};

export default function CgvPage() {
  return (
    <LegalPage title="Conditions générales de vente">
      <p>
        BonAppétit ! est un service <strong>gratuit</strong>, sans abonnement
        payant au moment de la consultation de ces CGV.
      </p>
      <p>
        Aucune vente de biens physiques n’est réalisée via l’application. Les
        listes de courses et estimations de prix sont des outils d’aide ;
        l’achat se fait chez l’enseigne choisie par l’utilisateur.
      </p>
      <p>
        Si une offre payante est introduite ultérieurement, les présentes CGV
        seront mises à jour avant toute facturation.
      </p>
      <p>
        Droit applicable : droit français. En cas de litige, recherche d’une
        solution amiable avant toute action judiciaire.
      </p>
    </LegalPage>
  );
}
