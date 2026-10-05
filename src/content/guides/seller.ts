import type { Guide } from "./types";

/** Guide du vendeur : le quotidien de la boutique, sans les réglages du gérant. */
export const sellerGuide: Guide = {
  role: "vendeur",
  label: "Vendeur",
  title: "Guide du vendeur",
  audience:
    "Pour les membres de l'équipe d'une boutique invités par le gérant : tenir le catalogue et le stock, traiter les commandes, répondre aux clients.",
  cover: "vendeur-tableau",
  chapters: [
    {
      id: "role",
      title: "Votre rôle de vendeur",
      blocks: [
        {
          type: "p",
          text: "Le gérant de la boutique vous a invité dans son équipe. Connectez-vous avec l'adresse e-mail qu'il a indiquée : vous arrivez directement dans l'espace de gestion de la boutique.",
        },
        { type: "shot", shot: { id: "vendeur-tableau", caption: "Le tableau de bord du vendeur." } },
        { type: "h2", text: "Ce que vous pouvez faire" },
        {
          type: "list",
          items: [
            "Gérer les **produits**, les **catégories** et le **stock**.",
            "Traiter les **commandes**, en enregistrer de nouvelles et télécharger les **factures**.",
            "Consulter les **clients**, répondre aux **avis** et générer les **rapports de stock**.",
          ],
        },
        {
          type: "tip",
          text: "Les prix d'achat, les gains, les paramètres, les thèmes et l'équipe restent réservés au gérant : ces menus n'apparaissent pas chez vous.",
        },
      ],
    },
    {
      id: "tableau",
      title: "Le tableau de bord",
      blocks: [
        {
          type: "list",
          items: [
            "Les **ventes** et **commandes du mois**, les **nouveaux clients** et les **produits actifs**.",
            "Les **commandes à traiter** : commencez votre journée par elles.",
            "La **santé du stock** : les articles en rupture ou sous leur seuil d'alerte, à réapprovisionner.",
          ],
        },
        {
          type: "p",
          text: "La **cloche** en haut de l'écran signale les nouvelles commandes, et un bip retentit tant que l'espace est ouvert. **Voir ma boutique** ouvre la vitrine telle que les clients la voient.",
        },
        {
          type: "tip",
          text: "Le bouton **?** en haut de chaque page relance sa visite guidée.",
        },
      ],
    },
    {
      id: "produits",
      title: "Produits et catégories",
      blocks: [
        { type: "shot", shot: { id: "vendeur-produits", caption: "La liste des produits." } },
        { type: "h2", text: "Ajouter un produit" },
        {
          type: "steps",
          items: [
            "Touchez **Ajouter un produit**.",
            "Saisissez le nom, la description, le prix de vente et la catégorie (une catégorie affichée).",
            "Indiquez le **stock initial** et le **seuil d'alerte**.",
            "Ajoutez au moins une photo, puis enregistrez.",
          ],
        },
        { type: "shot", shot: { id: "vendeur-produit-nouveau", caption: "Le formulaire « Nouveau produit »." } },
        {
          type: "list",
          items: [
            "Un nouveau produit commence **masqué** : activez **Publié** quand ses photos et son prix sont vérifiés.",
            "Le crayon modifie un produit ; la corbeille le retire (restaurable depuis **Corbeille**).",
          ],
        },
        {
          type: "tip",
          text: "Un article vendu en plusieurs tailles, couleurs ou contenances se crée une seule fois, avec ses **versions** : activez **Cet article existe en plusieurs versions** et saisissez chacune avec son stock (et son prix s'il diffère). Dans la fenêtre Stock, choisissez ensuite la version à réapprovisionner.",
        },
        { type: "h2", text: "Les catégories" },
        {
          type: "p",
          text: "**Catégories** crée et modifie les familles de produits. Une catégorie masquée n'est pas visible des clients ; un produit ne peut être rangé que dans une catégorie affichée.",
        },
        { type: "shot", shot: { id: "vendeur-categories", caption: "La page Catégories." } },
      ],
    },
    {
      id: "stock",
      title: "Le stock",
      blocks: [
        {
          type: "p",
          text: "Les commandes font baisser le stock toutes seules ; les annulations et retours le font remonter. À la réception d'une livraison ou après un inventaire, ouvrez la fenêtre **Stock** d'un produit (icône dans la liste).",
        },
        {
          type: "steps",
          items: [
            "**Réapprovisionner** : saisissez la quantité reçue et, si besoin, une note (fournisseur), puis **Ajouter au stock**.",
            "**Corriger** : après un comptage, saisissez la quantité réelle et le motif de l'écart.",
            "**Historique** : retrouvez chaque mouvement, avec sa date et son auteur.",
          ],
        },
        { type: "shot", shot: { id: "vendeur-stock", caption: "Réapprovisionner un produit." } },
        {
          type: "tip",
          tone: "warning",
          text: "Chaque mouvement est enregistré à votre nom : vérifiez la quantité avant de valider.",
        },
      ],
    },
    {
      id: "commandes",
      title: "Les commandes",
      blocks: [
        { type: "shot", shot: { id: "vendeur-commandes", caption: "La page Commandes." } },
        {
          type: "steps",
          items: [
            "**En cours d'analyse** : vérifiez la commande, puis **Prêt pour livraison**.",
            "**Prêt pour livraison** : une fois remise au livreur, **Livraison en cours**.",
            "**Livraison en cours** : à la remise au client, **Livré**. La facture est émise et le client invité à donner son avis.",
          ],
        },
        { type: "h2", text: "Cas particuliers" },
        {
          type: "list",
          items: [
            "**Annuler** une commande en analyse, ou marquer une commande livrée **Retourné** ou **Défectueux** : le motif est obligatoire et visible du client ; le stock est remis à jour.",
            "**Commande manuelle** : une vente au comptoir ou par téléphone, pour un client sans compte.",
          ],
        },
        { type: "shot", shot: { id: "vendeur-commande-manuelle", caption: "Une commande manuelle." } },
      ],
    },
    {
      id: "clients",
      title: "Clients, avis et rapports",
      blocks: [
        { type: "h2", text: "Les clients" },
        {
          type: "p",
          text: "**Clients** liste les personnes qui ont commandé : historique, total dépensé, repères Nouveau, Fidèle et Inactif. Appelez ou écrivez sur WhatsApp depuis la fiche d'un client.",
        },
        { type: "shot", shot: { id: "vendeur-clients", caption: "Le fichier clients." } },
        { type: "h2", text: "Les avis" },
        {
          type: "p",
          text: "**Avis clients** affiche d'abord les avis sans réponse. Répondez avec courtoisie : la réponse à un avis sur un article est publique, celle sur la livraison reste privée.",
        },
        { type: "shot", shot: { id: "vendeur-avis", caption: "Répondre aux avis." } },
        { type: "h2", text: "Les rapports de stock" },
        {
          type: "p",
          text: "**Rapports de stock** produit l'état du stock, les sorties et les mouvements sur une période, en PDF ou en CSV. Les colonnes de prix d'achat n'y figurent pas pour un vendeur.",
        },
        { type: "shot", shot: { id: "vendeur-rapports", caption: "Les rapports de stock." } },
      ],
    },
  ],
};
