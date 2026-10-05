import type { Guide } from "./types";

/** Guide du Super Admin : administrer la plateforme ManuShop. */
export const superAdminGuide: Guide = {
  role: "super-admin",
  label: "Super Admin",
  title: "Guide du Super Admin",
  audience:
    "Pour l'équipe ManuShop : gérer les comptes et les commerçants, les offres premium, les messages, les réglages de la plateforme et ces guides.",
  cover: "admin-commercants",
  chapters: [
    {
      id: "acces",
      title: "Accès et espace Super Admin",
      blocks: [
        {
          type: "p",
          text: "L'espace Super Admin s'ouvre à l'adresse **/super-admin**. Il n'est accessible qu'aux adresses e-mail inscrites dans la collection Firestore **platformAdmins**, ajoutées à la main depuis la console Firebase : aucun écran de l'application ne permet d'accorder ce privilège, pas même à un Super Admin.",
        },
        { type: "shot", shot: { id: "admin-comptes", caption: "L'espace Super Admin : la page Comptes." } },
        {
          type: "tip",
          text: "Le menu de gauche affiche une pastille rouge quand des messages de commerçants attendent une réponse.",
        },
      ],
    },
    {
      id: "comptes",
      title: "Comptes et commerçants",
      blocks: [
        { type: "h2", text: "Donner ou retirer le rôle de gérant" },
        {
          type: "steps",
          items: [
            "Dans **Comptes**, cherchez un utilisateur par pseudo, e-mail ou téléphone.",
            "**Donner l'admin** lui ouvre un espace de gestion, sans limite de durée.",
            "**Retirer l'admin** lui rend un compte client ; ses boutiques restent intactes.",
          ],
        },
        { type: "h2", text: "Suivre les commerçants" },
        {
          type: "p",
          text: "**Commerçants** liste les comptes qui possèdent au moins une boutique. Dépliez une ligne pour voir chaque boutique, son état de publication et ses privilèges premium ; un interrupteur active ou retire un privilège pour cette boutique, indépendamment de son abonnement.",
        },
        { type: "shot", shot: { id: "admin-commercants", caption: "Les commerçants et les privilèges de leurs boutiques." } },
      ],
    },
    {
      id: "tags",
      title: "Tags de catégorie",
      blocks: [
        {
          type: "p",
          text: "Les tags (Beauté, Mode, Alimentation…) classent les articles du Marché, quelle que soit la façon dont chaque boutique nomme ses catégories. Vous seul les créez : les commerçants rattachent chaque catégorie à l'un d'eux.",
        },
        { type: "shot", shot: { id: "admin-tags", caption: "Les tags de catégorie." } },
        {
          type: "list",
          items: [
            "**Créer** : un nom et une couleur.",
            "**Modifier** : double-cliquez sur un tag ou touchez le crayon.",
            "**Supprimer** : les catégories qui l'utilisaient n'apparaissent plus sous ce filtre du Marché.",
          ],
        },
      ],
    },
    {
      id: "premium",
      title: "Offres premium",
      blocks: [
        {
          type: "p",
          text: "**Offres premium** décide de ce qui est payant, de son prix à l'unité et de ce que chaque formule d'abonnement inclut. Le paiement se fait hors de l'application pour l'instant : vous validez une demande une fois l'argent reçu.",
        },
        { type: "shot", shot: { id: "admin-offres", caption: "Demandes d'achat et articles premium." } },
        { type: "h2", text: "Valider une demande d'achat" },
        {
          type: "steps",
          items: [
            "Une demande apparaît en tête de page quand un gérant veut acheter un article (ex. un thème).",
            "Vérifiez le paiement reçu (Orange Money, MTN Mobile Money…).",
            "Touchez **Paiement reçu, valider** : l'article est acquis définitivement par la boutique. **Refuser** sinon.",
          ],
        },
        { type: "h2", text: "Articles et formules" },
        {
          type: "list",
          items: [
            "**Articles premium** : pour chaque fonctionnalité ou thème, l'interrupteur **Premium** et le prix à l'unité en FCFA (sans prix, l'achat est impossible).",
            "**Formules** : le prix de chaque durée d'abonnement et les articles qu'elle inclut, à cocher.",
            "Une boutique qui perd l'accès à un thème premium revient automatiquement au thème gratuit.",
          ],
        },
      ],
    },
    {
      id: "messages",
      title: "Messages des commerçants",
      blocks: [
        {
          type: "p",
          text: "Les gérants vous écrivent depuis **Contacter le Super Admin**. **Messages** les liste, toutes boutiques confondues, avec leur état (**En attente** ou **Répondu**) ; ouvrez-en un pour répondre. La réponse s'affiche chez le gérant, sous son message.",
        },
        { type: "shot", shot: { id: "admin-messages", caption: "Les messages des commerçants." } },
      ],
    },
    {
      id: "reglages",
      title: "Réglages de la plateforme",
      blocks: [
        { type: "shot", shot: { id: "admin-reglages", caption: "Les réglages de la plateforme." } },
        {
          type: "list",
          items: [
            "**Catalogue de démonstration** : affiché tant qu'aucune boutique publiée n'a d'article ; désactivez-le pour ne jamais l'afficher.",
            "**Domaine du site** : l'adresse officielle utilisée par les QR codes des factures, le plan du site et les liens de partage. Saisissez le nouveau domaine quand il est acheté : il est vérifié avant d'être enregistré.",
            "**Promotion de l'accueil** : l'offre affichée avec un compte à rebours sur la page d'accueil ; elle disparaît d'elle-même à sa date de fin.",
            "**Taux de change** : la valeur du dollar US en FCFA (l'euro a une parité fixe), pour les boutiques qui affichent leurs prix en dollars.",
          ],
        },
      ],
    },
    {
      id: "guides",
      title: "Guides d'utilisation",
      blocks: [
        {
          type: "p",
          text: "**Guides d'utilisation** présente un guide par rôle : client, vendeur, gérant et Super Admin. Choisissez un guide, feuilletez-le page par page (boutons ou flèches du clavier) ou sautez à un chapitre depuis le sommaire.",
        },
        { type: "shot", shot: { id: "admin-guide", caption: "La page des guides d'utilisation." } },
        { type: "h2", text: "Exporter un guide en PDF" },
        {
          type: "steps",
          items: [
            "Choisissez le guide à exporter, puis touchez **Exporter en PDF**.",
            "Dans la fenêtre d'impression, choisissez la destination **Enregistrer au format PDF** (le format A4 sans marges est déjà réglé).",
            "Envoyez le fichier aux utilisateurs concernés.",
          ],
        },
        {
          type: "tip",
          text: "Après une évolution de l'interface, les captures se régénèrent automatiquement avec le script **scripts/guide/capture.mjs** (voir l'en-tête du script).",
        },
      ],
    },
  ],
};
