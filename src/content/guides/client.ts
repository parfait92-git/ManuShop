import type { Guide } from "./types";

/** Guide du client : acheter sur ManuShop, depuis son téléphone. */
export const clientGuide: Guide = {
  role: "client",
  label: "Client",
  title: "Guide du client",
  audience:
    "Pour toute personne qui achète sur ManuShop : découvrir les boutiques, commander, suivre ses livraisons, télécharger ses factures et donner son avis.",
  cover: "client-boutique",
  chapters: [
    {
      id: "bienvenue",
      title: "Bienvenue sur ManuShop",
      blocks: [
        {
          type: "p",
          text: "ManuShop réunit les boutiques en ligne de commerçants camerounais. Vous y parcourez leurs articles, commandez en quelques gestes et suivez votre livraison jusqu'à votre porte. Ce guide vous accompagne pas à pas, depuis votre téléphone.",
        },
        { type: "shot", shot: { id: "client-accueil", caption: "La page d'accueil de ManuShop." } },
        { type: "h2", text: "Installer ManuShop sur votre téléphone" },
        {
          type: "p",
          text: "ManuShop s'installe comme une application, sans passer par un magasin d'applications : elle s'ouvre ensuite depuis votre écran d'accueil, même avec une connexion faible.",
        },
        {
          type: "steps",
          items: [
            "Ouvrez ManuShop dans votre navigateur (Chrome sur Android, Safari sur iPhone).",
            "Sur Android, touchez **Installer** dans le bandeau proposé, ou le menu ⋮ puis **Ajouter à l'écran d'accueil**.",
            "Sur iPhone, touchez le bouton **Partager**, puis **Sur l'écran d'accueil**.",
          ],
        },
        {
          type: "tip",
          text: "Le bouton **?** en haut de chaque page relance une courte visite guidée de la page. Les petits **?** à côté des champs expliquent ce qu'il faut y saisir.",
        },
      ],
    },
    {
      id: "compte",
      title: "Créer un compte et se connecter",
      blocks: [
        {
          type: "p",
          text: "Vous pouvez parcourir les boutiques sans compte. Un compte est nécessaire pour commander : il garde vos coordonnées, vos commandes, vos factures et vos favoris.",
        },
        {
          type: "shots",
          shots: [
            { id: "client-inscription", caption: "Créer un compte." },
            { id: "client-connexion", caption: "Se connecter." },
          ],
        },
        { type: "h2", text: "Créer votre compte" },
        {
          type: "steps",
          items: [
            "Touchez l'icône de compte en haut de l'écran, puis **Créer un compte**.",
            "Saisissez votre nom, votre adresse e-mail et un mot de passe (deux fois).",
            "Touchez **Créer mon compte**, puis connectez-vous.",
          ],
        },
        { type: "h2", text: "Se connecter" },
        {
          type: "list",
          items: [
            "Avec votre **e-mail et votre mot de passe**, ou avec votre compte **Google** ou **Facebook**.",
            "Cochez **Se souvenir de moi** sur votre propre téléphone pour rester connecté.",
            "Mot de passe oublié ? Touchez **Mot de passe oublié ?** : un lien de réinitialisation vous est envoyé par e-mail.",
          ],
        },
        {
          type: "tip",
          tone: "warning",
          text: "Un compte ne reste connecté que sur un seul appareil à la fois : vous connecter ailleurs déconnecte automatiquement l'appareil précédent.",
        },
      ],
    },
    {
      id: "decouvrir",
      title: "Découvrir les boutiques et les articles",
      blocks: [
        { type: "h2", text: "Le Marché" },
        {
          type: "p",
          text: "Le **Marché** (menu **Catalogue**) rassemble les articles de toutes les boutiques. Filtrez-les par thème (Beauté, Mode, Alimentation…), cherchez un article par son nom et triez par nouveauté ou par prix.",
        },
        {
          type: "shots",
          shots: [
            { id: "client-marche", caption: "Le Marché : tous les articles." },
            { id: "client-boutiques", caption: "Toutes les boutiques." },
          ],
        },
        { type: "h2", text: "La page d'une boutique" },
        {
          type: "p",
          text: "Chaque boutique a sa propre page, à ses couleurs : son logo, ses articles classés par catégories, ses moyens de contact. Ouvrez-la depuis **Voir toutes les boutiques** ou depuis la fiche d'un article (**Vendu par**).",
        },
        { type: "shot", shot: { id: "client-boutique", caption: "La page de la boutique « Maison Awa Cosmétiques »." } },
        {
          type: "tip",
          text: "Un lien de boutique partagé par WhatsApp ou sur les réseaux sociaux ouvre directement cette page.",
        },
      ],
    },
    {
      id: "article",
      title: "Consulter un article",
      blocks: [
        {
          type: "p",
          text: "La fiche d'un article présente ses photos, son prix (barré en cas de promotion), sa description, le stock disponible, la boutique qui le vend et les avis des clients.",
        },
        {
          type: "shots",
          shots: [
            { id: "client-produit", caption: "La fiche d'un article." },
            { id: "client-photo", caption: "Une photo en grand." },
          ],
        },
        { type: "h2", text: "Voir les photos en grand" },
        {
          type: "list",
          items: [
            "Touchez la photo principale ou une vignette pour l'ouvrir en plein écran.",
            "Faites glisser votre doigt vers la gauche ou la droite pour passer d'une photo à l'autre.",
            "Touchez la photo pour zoomer ; touchez la croix pour revenir à la fiche.",
          ],
        },
        { type: "h2", text: "Choisir une version" },
        {
          type: "p",
          text: "Certains articles existent en plusieurs versions (taille, couleur, contenance…). Touchez la version voulue : son prix et sa disponibilité s'affichent ; une version barrée est épuisée. Sur le Marché, ces articles affichent « Dès » leur prix le plus bas et le bouton **Choisir une version**.",
        },
        { type: "shot", shot: { id: "client-variantes", caption: "Choisir la contenance d'un article." } },
        { type: "h2", text: "Disponibilité et favoris" },
        {
          type: "list",
          items: [
            "**En stock** indique le nombre d'articles disponibles ; un article **en rupture** reste visible mais ne peut pas être ajouté au panier.",
            "Le **cœur** ajoute l'article à vos favoris, pour le retrouver plus tard dans **Mes favoris**.",
          ],
        },
      ],
    },
    {
      id: "commander",
      title: "Commander",
      blocks: [
        { type: "h2", text: "Le panier" },
        {
          type: "steps",
          items: [
            "Sur la fiche d'un article, touchez **Ajouter au panier**.",
            "Ouvrez le panier avec l'icône en haut à droite : modifiez les quantités ou retirez un article.",
            "Touchez **Choisir un mode de paiement** pour passer à la commande.",
          ],
        },
        {
          type: "tip",
          text: "Un panier contient les articles d'une seule boutique. Les quantités sont limitées au stock disponible : vous ne pouvez pas commander plus que ce que la boutique possède.",
        },
        {
          type: "shots",
          shots: [
            { id: "client-panier", caption: "Le panier." },
            { id: "client-paiement", caption: "Confirmer la commande." },
          ],
        },
        { type: "h2", text: "Confirmer la commande" },
        {
          type: "steps",
          items: [
            "Vérifiez votre nom, votre téléphone et votre adresse de livraison : ils sont repris de votre compte, et enregistrés pour la prochaine fois s'ils n'y étaient pas encore.",
            "Choisissez un mode de paiement (Orange Money, MTN Mobile Money, carte).",
            "Touchez **Confirmer ma commande** : la boutique la reçoit immédiatement.",
          ],
        },
        {
          type: "tip",
          tone: "warning",
          text: "Le paiement en ligne arrive bientôt. En attendant, la boutique vous contacte pour convenir du règlement, souvent à la livraison.",
        },
      ],
    },
    {
      id: "suivi",
      title: "Suivre ses commandes",
      blocks: [
        {
          type: "p",
          text: "**Mes commandes** (menu de votre compte) liste vos commandes, des plus récentes aux plus anciennes. Leur état se met à jour tout seul, sans recharger la page, dès que la boutique avance.",
        },
        { type: "shot", shot: { id: "client-commandes", caption: "Mes commandes, avec leur état en direct." } },
        { type: "h2", text: "Les étapes d'une commande" },
        {
          type: "list",
          items: [
            "**En cours d'analyse** : la boutique vérifie votre commande.",
            "**Prêt pour la livraison** : vos articles sont emballés.",
            "**Livraison en cours** : le livreur est en route.",
            "**Livré** : la commande vous a été remise ; la facture est disponible.",
            "**Annulée**, **Retourné** ou **Défectueux** : la commande n'a pas abouti ; le motif est indiqué.",
          ],
        },
        { type: "h2", text: "Annuler une commande" },
        {
          type: "p",
          text: "Tant qu'elle est **En cours d'analyse**, touchez **Annuler** et indiquez le motif. Une fois la préparation commencée, contactez la boutique.",
        },
      ],
    },
    {
      id: "factures",
      title: "Factures",
      blocks: [
        {
          type: "p",
          text: "Dès qu'une commande est livrée, sa facture est prête : touchez **Facture** dans **Mes commandes** pour la télécharger en PDF. Elle porte le logo et les coordonnées de la boutique, le détail des articles et le total payé.",
        },
        { type: "shot", shot: { id: "client-facture", caption: "Une facture PDF." } },
        { type: "h2", text: "Vérifier une facture" },
        {
          type: "p",
          text: "Chaque facture est signée numériquement par ManuShop. Le **QR code** en bas de page ouvre une page de vérification : elle confirme que la facture est authentique et affiche les montants officiels et les étapes de la commande.",
        },
        { type: "shot", shot: { id: "client-verification", caption: "La page de vérification d'une facture." } },
        {
          type: "tip",
          tone: "warning",
          text: "Ne vous fiez qu'à une page de vérification dont l'adresse est celle de ManuShop, et comparez les montants avec ceux de votre facture.",
        },
      ],
    },
    {
      id: "avis",
      title: "Donner son avis",
      blocks: [
        {
          type: "p",
          text: "Quand une commande est livrée, une **notification** (cloche en haut de l'écran) vous invite à donner votre avis. Vous pouvez aussi toucher **Donner mon avis** dans **Mes commandes**.",
        },
        {
          type: "shots",
          shots: [
            { id: "client-notifications", caption: "Les notifications." },
            { id: "client-avis", caption: "Donner son avis, étape par étape." },
          ],
        },
        {
          type: "steps",
          items: [
            "**La livraison** : une note et un commentaire, visibles par la boutique seulement.",
            "**Chaque article** : une note et un commentaire, publiés sur la fiche de l'article pour aider les autres clients.",
            "Cochez **Signaler un article défectueux** si un article est arrivé abîmé.",
          ],
        },
        {
          type: "tip",
          text: "Chaque étape est enregistrée dès que vous l'envoyez ; touchez **Passer** pour aller à la suivante. Quand la boutique vous répond, vous recevez une notification.",
        },
      ],
    },
    {
      id: "compte-favoris",
      title: "Favoris et paramètres du compte",
      blocks: [
        {
          type: "shots",
          shots: [
            { id: "client-favoris", caption: "Mes favoris." },
            { id: "client-compte", caption: "Paramètres du compte." },
          ],
        },
        { type: "h2", text: "Mes favoris" },
        { type: "p", text: "Les articles marqués d'un cœur, prêts à être ajoutés au panier." },
        { type: "h2", text: "Paramètres du compte" },
        {
          type: "list",
          items: [
            "Modifiez votre nom, votre photo, votre téléphone et votre adresse de livraison.",
            "Changez votre mot de passe (compte e-mail).",
            "Choisissez de recevoir ou non les e-mails d'information de ManuShop.",
          ],
        },
        { type: "h2", text: "Ouvrir votre propre boutique" },
        {
          type: "p",
          text: "Vous vendez vous aussi ? Dans le menu de votre compte, touchez **Créer ma boutique** : un assistant vous guide en quatre étapes (informations, logo, récapitulatif, abonnement). Le **Guide du gérant de boutique** détaille la suite.",
        },
      ],
    },
  ],
};
