import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Confidentialité · BonAppétit !",
};

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <p>
        Les comptes (e-mail / Apple / Google) et coffres (favoris, paniers,
        courses) sont stockés de façon sécurisée sur une base Postgres (Neon)
        hébergée avec le projet. Les mots de passe sont hachés (bcrypt), jamais
        stockés en clair. La session utilise un cookie HttpOnly sécurisé.
      </p>
      <p>
        Un cache technique peut rester sur votre appareil (navigateur) pour le
        confort d’usage ; il ne contient pas votre mot de passe.
      </p>
      <p>
        Base légale : exécution du service / intérêt légitime et, le cas
        échéant, consentement (cookies non essentiels, connexions sociales).
      </p>
      <p>
        Vos droits (accès, rectification, effacement, opposition) : contactez
        l’éditeur via les mentions légales, ou utilisez « Se déconnecter » /
        suppression de compte sur demande.
      </p>
    </LegalPage>
  );
}
