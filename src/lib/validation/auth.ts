import * as z from "zod";

export const RegisterSchema = z
  .object({
    displayName: z.string().trim().min(2, {
      error: "Le nom doit contenir au moins 2 caractères.",
    }),
    shopName: z.string().trim().min(2, {
      error: "Le nom de la boutique doit contenir au moins 2 caractères.",
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
  shopName: z.string().trim().min(2, {
    error: "Le nom de la boutique doit contenir au moins 2 caractères.",
  }),
});

export type CompleteMerchantSignupInput = z.infer<
  typeof CompleteMerchantSignupSchema
>;

export const ShopProfileSchema = z.object({
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
});

export type ShopProfileInput = z.infer<typeof ShopProfileSchema>;
