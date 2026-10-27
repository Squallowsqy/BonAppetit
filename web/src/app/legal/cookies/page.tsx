import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Cookies · BonAppétit !",
};

export default function CookiesPage() {
  return (
    <LegalPage title="Politique cookies">
      <p>
        BonAppétit ! utilise des cookies et technologies similaires
        strictement nécessaires au fonctionnement (session, préférences
        techniques, authentification).
      </p>
      <p>
        Des cookies ou stockage local peuvent être déposés pour mémoriser votre
        menu, votre magasin et votre compte sur cet appareil.
      </p>
      <p>
        Les connexions Apple ou Google peuvent entraîner le dépôt de cookies
        par ces prestataires, soumis à leurs propres politiques.
      </p>
      <p>
        Vous pouvez refuser ou supprimer les cookies via les paramètres de
        votre navigateur. Certaines fonctions (connexion, sauvegarde) peuvent
        alors être limitées.
      </p>
    </LegalPage>
  );
}
