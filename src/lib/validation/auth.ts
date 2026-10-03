import * as z from "zod";

export const RegisterSchema = z
  .object({
    displayName: z.string().trim().min(2, {
      error: "Le nom doit contenir au moins 2 caractères.",
    }),
    email: z.email({ error: "Veuillez saisir un email valide." }).trim(),
    password: z
      .string()
      .min(8, { error: "Le mot de passe doit contenir au moins 8 caractères." })
      .regex(/[a-zA-Z]/, { error: "Doit contenir au moins une lettre." })
      .regex(/[0-9]/, { error: "Doit contenir au moins un chiffre." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.email({ error: "Veuillez saisir un email valide." }).trim(),
  password: z.string().min(1, { error: "Le mot de passe est requis." }),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.email({ error: "Veuillez saisir un email valide." }).trim(),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const InviteSellerSchema = z.object({
  displayName: z.string().trim().min(2, {
    error: "Le nom doit contenir au moins 2 caractères.",
  }),
  email: z.email({ error: "Veuillez saisir un email valide." }).trim(),
});

export type InviteSellerInput = z.infer<typeof InviteSellerSchema>;

export const CompleteMerchantSignupSchema = z.object({
  displayName: z.string().trim().min(2, {
    error: "Le nom doit contenir au moins 2 caractères.",
  }),
});

export type CompleteMerchantSignupInput = z.infer<
  typeof CompleteMerchantSignupSchema
>;

export const CreateShopSchema = z.object({
  shopName: z.string().trim().min(2, {
    error: "Le nom de la boutique doit contenir au moins 2 caractères.",
  }),
});

export type CreateShopInput = z.infer<typeof CreateShopSchema>;

// BF-79→85 : assistant "Créer ma boutique". Seul le nom est requis — le
// récapitulatif (étape 3) affiche "Non renseigné(e)" pour tout le reste,
// conforme à la maquette reçue (voir docs/design-prompts.txt, items 6-9).
export const CreateShopWizardSchema = z.object({
  name: z.string().trim().min(2, {
    error: "Le nom de la boutique doit contenir au moins 2 caractères.",
  }),
  sector: z.string().trim().optional(),
  address: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  // "Galerie" pose `logo` via l'upload+recadrage (géré hors formulaire, voir
  // CreateShopWizard) ; "Lien" valide une URL directement dans le champ.
  logoMode: z.enum(["gallery", "link"]),
  logo: z
    .union([z.url({ error: "L'URL du logo n'est pas valide." }), z.literal("")])
    .optional(),
  subscriptionPlan: z.enum([
    "daily",
    "weekly",
    "monthly",
    "quarterly",
    "yearly",
  ]),
});

export type CreateShopWizardInput = z.infer<typeof CreateShopWizardSchema>;

export const ShopSettingsSchema = z.object({
  // Profil de la boutique (BF-04) — inchangé, juste réuni sur la même page.
  name: z.string().trim().min(2, {
    error: "Le nom de la boutique doit contenir au moins 2 caractères.",
  }),
  logo: z.url({ error: "L'URL du logo n'est pas valide." }).or(z.literal("")),
  // Bascule Galerie/Lien de `ShopLogoStep` (BF-81, réutilisé ici pour
  // modifier le logo après la création — jusque-là un simple champ URL,
  // sans upload possible). Purement local au formulaire, jamais persisté :
  // `Shop` ne garde que l'URL finale, peu importe comment elle a été
  // obtenue.
  logoMode: z.enum(["gallery", "link"]),
  description: z.string().trim().max(500, {
    error: "La description ne doit pas dépasser 500 caractères.",
  }),
  address: z.string().trim().min(3, {
    error: "L'adresse doit contenir au moins 3 caractères.",
  }),
  phone: z.string().trim().min(6, {
    error: "Le numéro de téléphone n'est pas valide.",
  }),
  whatsapp: z.string().trim().min(6, {
    error: "Le numéro WhatsApp n'est pas valide.",
  }),
  // Régionalisation
  language: z.enum(["fr", "en"]),
  currency: z.enum(["XAF", "EUR", "USD"]),
  // Publication multicanale
  primarySocialNetwork: z.enum([
    "whatsapp",
    "facebook",
    "instagram",
    "tiktok",
  ]),
  // Lien vers la page du réseau principal ci-dessus (BF-128, affiché sur la
  // fiche produit) — un champ par réseau, un seul rempli/affiché à la fois
  // selon `primarySocialNetwork` (voir `lib/shopSocialNetworks.ts`).
  facebookUrl: z.url({ error: "Le lien Facebook n'est pas valide." }).or(z.literal("")),
  instagramUrl: z.url({ error: "Le lien Instagram n'est pas valide." }).or(z.literal("")),
  tiktokUrl: z.url({ error: "Le lien TikTok n'est pas valide." }).or(z.literal("")),
  whatsappBusinessUrl: z
    .url({ error: "Le lien WhatsApp n'est pas valide." })
    .or(z.literal("")),
  // Notifications de commande
  notifyOrdersByEmail: z.boolean(),
  notifyOrdersBySocial: z.boolean(),
  urgentPhoneAlerts: z.boolean(),
  // Sons de notification dans le dashboard
  soundOnNewOrder: z.boolean(),
  soundOnOrderStatusChange: z.boolean(),
  soundOnNewMessage: z.boolean(),
  // Contacts de commande
  contactEmail: z
    .email({ error: "Veuillez saisir un email valide." })
    .or(z.literal("")),
  urgentPhone: z.string().trim(),
  // Moyens de contact client (BF-105, premium) — distinct des "Contacts de
  // commande" ci-dessus.
  clientContactMethods: z.array(
    z.enum(["email", "whatsapp", "facebook", "instagram"])
  ),
  publicContactEmail: z
    .email({ error: "Veuillez saisir un email valide." })
    .or(z.literal("")),
  // Visibilité (BF-88)
  isPublished: z.boolean(),
  // Facturation (BF-29, 2026-10-03)
  // Vide : la facture suit la couleur du thème de la boutique.
  themeColor: z.string().regex(/^(#[0-9a-fA-F]{6})?$/, {
    error: "Choisissez une couleur.",
  }),
  vatRate: z
    .number({ error: "Indiquez un taux, ou 0 si vous n'êtes pas assujetti à la TVA." })
    .min(0, { error: "Le taux ne peut pas être négatif." })
    .max(100, { error: "Le taux ne peut pas dépasser 100 %." }),
  taxId: z.string().trim().max(40, { error: "40 caractères au maximum." }),
  tradeRegister: z.string().trim().max(40, { error: "40 caractères au maximum." }),
});

export type ShopSettingsInput = z.infer<typeof ShopSettingsSchema>;

export const AccountSettingsSchema = z.object({
  displayName: z.string().trim().min(2, {
    error: "Le nom doit contenir au moins 2 caractères.",
  }),
  // Optionnel : un compte créé par email/Google/Facebook n'a pas forcément
  // de téléphone renseigné.
  phone: z.string().trim().optional(),
  // Adresse de livraison proposée à chaque commande (2026-10-03).
  deliveryAddress: z
    .string()
    .trim()
    .max(200, { error: "200 caractères au maximum." })
    .optional(),
  photoURL: z
    .union([z.url({ error: "L'URL de la photo n'est pas valide." }), z.literal("")])
    .optional(),
  notifyByEmail: z.boolean(),
});

export type AccountSettingsInput = z.infer<typeof AccountSettingsSchema>;
