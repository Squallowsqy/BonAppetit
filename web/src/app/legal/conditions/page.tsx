import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Conditions d'utilisation · BonAppétit !",
};

export default function ConditionsPage() {
  return (
    <LegalPage title="Conditions d'utilisation">
      <p>
        En utilisant BonAppétit !, vous acceptez les présentes conditions.
        L’accès au service est réservé à un usage personnel et non commercial.
      </p>
      <p>
        Vous êtes responsable des informations que vous saisissez (régime,
        allergènes, compte). Les suggestions de recettes ne remplacent pas un
        avis médical ou nutritionnel.
      </p>
      <p>
        Il est interdit d’utiliser le service de manière abusive (scraping
        massif, contournement de sécurité, usurpation d’identité).
      </p>
      <p>
        Nous pouvons modifier le service ou ces conditions. La poursuite
        d’utilisation après mise à jour vaut acceptation.
      </p>
    </LegalPage>
  );
}
