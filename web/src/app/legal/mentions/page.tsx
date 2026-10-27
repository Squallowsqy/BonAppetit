import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Mentions légales · BonAppétit !",
};

export default function MentionsPage() {
  return (
    <LegalPage title="Mentions légales">
      <p>
        <strong>Éditeur</strong> — BonAppétit ! est un service édité à titre
        personnel / projet. Contact : via le formulaire ou l’adresse indiquée
        sur le site.
      </p>
      <p>
        <strong>Hébergement</strong> — Le site est hébergé par le prestataire
        technique utilisé pour le déploiement (ex. Vercel Inc., États-Unis /
        Union européenne selon configuration).
      </p>
      <p>
        <strong>Propriété intellectuelle</strong> — Les contenus, marques et
        éléments graphiques de BonAppétit ! sont protégés. Toute reproduction
        non autorisée est interdite.
      </p>
      <p>
        <strong>Responsabilité</strong> — Les menus et estimations de prix sont
        fournis à titre indicatif. Vérifiez toujours les étiquettes et allergènes
        en magasin.
      </p>
    </LegalPage>
  );
}
