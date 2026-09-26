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

export const PhoneLoginSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, {
      error: "Format international requis, ex. +237600000000.",
    }),
});

export type PhoneLoginInput = z.infer<typeof PhoneLoginSchema>;

export const PhoneCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, {
    error: "Le code doit contenir 6 chiffres.",
  }),
});

export type PhoneCodeInput = z.infer<typeof PhoneCodeSchema>;

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
  // Notifications de commande
  notifyOrdersByEmail: z.boolean(),
  notifyOrdersBySocial: z.boolean(),
  urgentPhoneAlerts: z.boolean(),
  // Contacts de commande
  contactEmail: z
    .email({ error: "Veuillez saisir un email valide." })
    .or(z.literal("")),
  urgentPhone: z.string().trim(),
  // Visibilité (BF-88)
  isPublished: z.boolean(),
});

export type ShopSettingsInput = z.infer<typeof ShopSettingsSchema>;
