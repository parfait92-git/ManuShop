import type { Guide } from "./types";

/** Guide du gérant : créer, configurer et faire tourner sa boutique. */
export const managerGuide: Guide = {
  role: "gerant",
  label: "Gérant",
  title: "Guide du gérant de boutique",
  audience:
    "Pour le propriétaire d'une boutique : la créer et la configurer, gérer le catalogue, le stock et les commandes, suivre ses gains et son équipe.",
  cover: "gerant-tableau",
  chapters: [
    {
      id: "espace",
      title: "Votre espace de gestion",
      blocks: [
        {
          type: "p",
          text: "Votre espace de gestion s'ouvre après la connexion. Le **menu de gauche** donne accès à chaque partie de la boutique ; en haut, **Voir ma boutique** ouvre votre vitrine telle que vos clients la voient, et la **cloche** signale les nouvelles commandes.",
        },
        { type: "shot", shot: { id: "gerant-tableau", caption: "Le tableau de bord du gérant." } },
        { type: "h2", text: "Le tableau de bord" },
        {
          type: "list",
          items: [
            "**Ventes du mois**, **Commandes du mois**, **Nouveaux clients** et **Produits actifs**, comparés au mois précédent.",
            "Le nombre de **commandes à traiter**, à ouvrir en un geste.",
            "La **santé du stock** (articles en rupture ou sous leur seuil d'alerte) et les commandes de la semaine.",
          ],
        },
        {
          type: "tip",
          text: "Le bouton **?** en haut de chaque page relance sa visite guidée ; les **?** à côté des champs expliquent leur rôle. Un bip retentit à chaque nouvelle commande tant que l'espace est ouvert (réglable dans les Paramètres).",
        },
      ],
    },
    {
      id: "creer",
      title: "Créer et publier sa boutique",
      blocks: [
        {
          type: "p",
          text: "Depuis n'importe quel compte, le menu du compte propose **Créer ma boutique**. Un assistant vous guide en quatre étapes ; rien n'est enregistré si vous l'abandonnez en route.",
        },
        {
          type: "steps",
          items: [
            "**Informations** : nom, secteur, adresse, téléphone et WhatsApp.",
            "**Logo** : depuis la galerie du téléphone ou par un lien, recadré au format carré (facultatif).",
            "**Récapitulatif** : relisez avant de continuer.",
            "**Abonnement** : choisissez une durée (du jour à l'année) ; il est propre à cette boutique.",
          ],
        },
        { type: "shot", shot: { id: "gerant-creation", caption: "L'assistant « Créer ma boutique »." } },
        { type: "h2", text: "Publier la boutique" },
        {
          type: "p",
          text: "Une nouvelle boutique est en **brouillon** : seuls vous et votre équipe la voyez. Quand votre catalogue est prêt, activez **Boutique publiée** dans les **Paramètres** ; **Partager le lien** l'envoie ensuite par WhatsApp, e-mail ou sur les réseaux sociaux.",
        },
        { type: "shot", shot: { id: "gerant-parametres", caption: "Publication et profil de la boutique (Paramètres)." } },
      ],
    },
    {
      id: "parametres",
      title: "Paramètres de la boutique",
      blocks: [
        {
          type: "p",
          text: "Le menu **Paramètres** (réservé au gérant) rassemble tout ce qui décrit la boutique. Enregistrez avec **Enregistrer les paramètres**.",
        },
        {
          type: "list",
          items: [
            "**Profil** : nom, logo, description, adresse ; ils apparaissent sur la vitrine, la fiche des articles et les factures.",
            "**Contacts** : téléphone, WhatsApp, e-mail public ; moyens de contact proposés aux clients et liens de vos réseaux sociaux (fonctions premium).",
            "**Régionalisation** : langue et **devise** affichée aux clients (FCFA, euro ou dollar US) ; vos prix restent saisis en FCFA et sont convertis automatiquement.",
            "**Notifications** : bips à chaque nouvelle commande, changement de statut ou nouveau message.",
          ],
        },
        { type: "h2", text: "Facturation" },
        {
          type: "p",
          text: "Choisissez la couleur de vos factures (celle de votre thème ou une autre), votre **taux de TVA** (0 si elle ne s'applique pas : les prix restent TTC) et, si vous en avez, votre **NIU** et votre **RCCM**.",
        },
        { type: "shot", shot: { id: "gerant-facturation", caption: "La section Facturation des Paramètres." } },
      ],
    },
    {
      id: "catalogue",
      title: "Catégories et produits",
      blocks: [
        { type: "h2", text: "Créer les catégories" },
        {
          type: "p",
          text: "Les catégories organisent votre vitrine (ex. Soins cheveux, Savons). Chacune se rattache à un **tag** de la plateforme (Beauté, Mode…) qui la range au bon endroit du Marché. Une catégorie **masquée** n'apparaît pas aux clients.",
        },
        { type: "shot", shot: { id: "gerant-categories", caption: "La page Catégories." } },
        { type: "h2", text: "Ajouter un produit" },
        {
          type: "steps",
          items: [
            "Dans **Produits**, touchez **Ajouter un produit**.",
            "Saisissez le nom, la description, le **prix de vente** et la catégorie.",
            "Indiquez le **prix d'achat** : il reste confidentiel et calcule votre marge par unité.",
            "Saisissez le **stock initial** et le **seuil d'alerte** (au-dessous, l'article est signalé « Stock faible »).",
            "Ajoutez au moins une photo (recadrée au carré et allégée automatiquement), puis enregistrez.",
          ],
        },
        { type: "shot", shot: { id: "gerant-produit-nouveau", caption: "Le formulaire « Nouveau produit »." } },
        { type: "h2", text: "Publier, modifier, mettre en promotion" },
        {
          type: "list",
          items: [
            "Un nouveau produit commence **masqué** : activez **Publié** dans la liste quand il est prêt.",
            "L'icône crayon modifie un produit ; la corbeille le retire (il reste restaurable).",
            "Cochez **Produit en promotion** pour fixer un prix promotionnel et une date de fin : la promotion s'arrête toute seule à la fin de ce jour.",
          ],
        },
        { type: "shot", shot: { id: "gerant-produits", caption: "La liste des produits." } },
      ],
    },
    {
      id: "stock",
      title: "Gérer le stock",
      blocks: [
        {
          type: "p",
          text: "Le stock baisse automatiquement à chaque commande et remonte en cas d'annulation ou de retour. Pour le reste, l'icône **Stock** d'un produit (ou **Gérer le stock** sur sa fiche) ouvre une fenêtre à trois onglets ; chaque changement y est tracé.",
        },
        { type: "h2", text: "Réapprovisionner" },
        {
          type: "steps",
          items: [
            "Saisissez la **quantité reçue** : le nouveau stock s'affiche avant validation.",
            "Facultatif : le nouveau **prix d'achat unitaire** de cette livraison (il remplace l'ancien pour les prochaines ventes) et une note (fournisseur, bon de livraison).",
            "Touchez **Ajouter au stock**.",
          ],
        },
        { type: "shot", shot: { id: "gerant-stock-reappro", caption: "Réapprovisionner un produit." } },
        { type: "h2", text: "Corriger l'inventaire et consulter l'historique" },
        {
          type: "p",
          text: "Après un comptage, l'onglet **Corriger** remet le stock au chiffre réel, avec un motif obligatoire (casse, perte…). L'onglet **Historique** liste chaque entrée et sortie : date, variation, stock après, auteur, commande ou note.",
        },
        { type: "shot", shot: { id: "gerant-stock", caption: "L'historique du stock d'un produit." } },
        {
          type: "tip",
          text: "Le stock ne se modifie plus directement dans la fiche du produit : passer par la fenêtre Stock garantit un historique complet.",
        },
      ],
    },
    {
      id: "commandes",
      title: "Traiter les commandes",
      blocks: [
        {
          type: "p",
          text: "La page **Commandes** liste toutes les commandes, filtrables par statut. Un bouton fait avancer chaque commande à l'étape suivante ; le client voit le changement immédiatement.",
        },
        { type: "shot", shot: { id: "gerant-commandes", caption: "La page Commandes." } },
        {
          type: "steps",
          items: [
            "**En cours d'analyse** → **Prêt pour livraison** : vérifiez la commande et préparez-la.",
            "**Prêt pour livraison** → **Livraison en cours** : remettez-la au livreur.",
            "**Livraison en cours** → **Livré** : la facture est émise automatiquement et le client est invité à donner son avis.",
          ],
        },
        { type: "h2", text: "Annulation, retour, commande manuelle" },
        {
          type: "list",
          items: [
            "**Annuler** (tant que la commande est en analyse) ou marquer une commande livrée **Retourné** ou **Défectueux** : un motif est demandé, le stock est remis à jour.",
            "**Commande manuelle** enregistre une vente faite en boutique ou par téléphone, pour un client sans compte.",
            "**Facture** télécharge la facture d'une commande livrée.",
          ],
        },
        { type: "shot", shot: { id: "gerant-commande-manuelle", caption: "Enregistrer une commande manuelle." } },
      ],
    },
    {
      id: "factures",
      title: "Factures",
      blocks: [
        {
          type: "p",
          text: "À la livraison, ManuShop émet la facture : numéro continu propre à la boutique (F-00001, F-00002…), vos coordonnées et votre logo, le détail des articles, la TVA et le total. Vous et votre client la téléchargez en PDF.",
        },
        { type: "shot", shot: { id: "client-facture", caption: "Une facture émise par ManuShop." } },
        {
          type: "p",
          text: "Chaque facture est **signée numériquement** : son QR code ouvre une page publique qui confirme son authenticité et affiche les montants officiels. Une facture modifiée à la main est signalée « non conforme ».",
        },
      ],
    },
    {
      id: "clients-avis",
      title: "Clients et avis",
      blocks: [
        { type: "h2", text: "Le fichier clients" },
        {
          type: "p",
          text: "**Clients** regroupe toutes les personnes qui ont commandé, en ligne ou en boutique : nombre de commandes, total dépensé, dernière commande, repères **Nouveau**, **Fidèle** et **Inactif**. Cherchez par nom ou téléphone, appelez ou écrivez sur WhatsApp en un geste, exportez la liste en CSV.",
        },
        { type: "shot", shot: { id: "gerant-clients", caption: "Le fichier clients." } },
        { type: "h2", text: "Répondre aux avis" },
        {
          type: "p",
          text: "**Avis clients** affiche les avis reçus après livraison, en commençant par ceux sans réponse. L'avis sur la livraison est privé ; celui sur un article est public, et votre réponse s'affiche sous l'avis sur la fiche du produit. Le client est notifié de votre réponse.",
        },
        { type: "shot", shot: { id: "gerant-avis", caption: "Les avis clients, avec les réponses du vendeur." } },
      ],
    },
    {
      id: "chiffres",
      title: "Gains, statistiques et rapports",
      blocks: [
        { type: "h2", text: "Gains et statistiques" },
        {
          type: "p",
          text: "**Statistiques** (gérant seulement) calcule, pour les commandes livrées, le chiffre d'affaires, le coût d'achat, le gain et la marge — par article, par catégorie, par semaine ou par mois, sur cette semaine, ce mois, cette année ou une période choisie — ainsi que la valeur du stock au prix d'achat.",
        },
        { type: "shot", shot: { id: "gerant-stats", caption: "Gains et statistiques." } },
        { type: "h2", text: "Rapports de stock" },
        {
          type: "list",
          items: [
            "**État du stock** : chaque article à cet instant, son statut et la valeur du stock.",
            "**Sorties de stock** : quantités commandées, livrées et remises en stock sur une période.",
            "**Mouvements de stock** : chaque entrée et sortie, dans l'ordre, avec son auteur.",
          ],
        },
        {
          type: "p",
          text: "Téléchargez-les en **PDF** (à imprimer ou envoyer, aux couleurs de votre boutique) ou en **CSV** (pour Excel).",
        },
        { type: "shot", shot: { id: "gerant-rapports", caption: "Les rapports de stock." } },
      ],
    },
    {
      id: "themes",
      title: "Thèmes et offres premium",
      blocks: [
        {
          type: "p",
          text: "**Thèmes** change l'apparence de votre vitrine, de votre espace de gestion et de vos factures. **Aperçu** montre le thème avant de l'appliquer ; les thèmes marqués **Premium** s'achètent à l'unité ou sont inclus dans certaines formules d'abonnement.",
        },
        { type: "shot", shot: { id: "gerant-themes", caption: "Choisir un thème." } },
        {
          type: "steps",
          items: [
            "Sur un thème premium, demandez l'achat : la demande part à l'équipe ManuShop.",
            "Réglez le montant indiqué selon les instructions reçues (paiement hors application pour l'instant).",
            "Dès le paiement validé, le thème est à vous et s'applique en un geste.",
          ],
        },
      ],
    },
    {
      id: "equipe",
      title: "Équipe et boutiques",
      blocks: [
        { type: "h2", text: "Inviter un vendeur" },
        {
          type: "p",
          text: "**Équipe** ajoute des vendeurs qui gèrent la boutique avec vous : produits, stock, commandes, clients et avis. Ils ne voient ni les prix d'achat ni les gains, et n'accèdent pas aux Paramètres, aux Thèmes ni à l'Équipe.",
        },
        { type: "shot", shot: { id: "gerant-equipe", caption: "Inviter un vendeur." } },
        { type: "h2", text: "Plusieurs boutiques" },
        {
          type: "p",
          text: "**Mes boutiques** liste toutes vos boutiques, chacune avec son propre abonnement. **Gérer** bascule l'espace sur une boutique ; **Créer une nouvelle boutique** relance l'assistant.",
        },
        { type: "shot", shot: { id: "gerant-boutiques", caption: "Gestion de vos boutiques." } },
      ],
    },
    {
      id: "outils",
      title: "Corbeille, journal et assistance",
      blocks: [
        {
          type: "list",
          items: [
            "**Corbeille** : un produit ou une catégorie supprimé y reste jusqu'à ce que vous le restauriez ou le supprimiez définitivement (après un compte à rebours annulable).",
            "**Journal d'activité** : l'historique des actions de l'équipe (publications, commandes, paramètres).",
            "**Contacter le Super Admin** : écrivez à l'équipe ManuShop ; sa réponse s'affiche sous votre message.",
          ],
        },
        { type: "shot", shot: { id: "gerant-journal", caption: "Le journal d'activité." } },
        { type: "shot", shot: { id: "gerant-support", caption: "Contacter l'équipe ManuShop." } },
      ],
    },
  ],
};
