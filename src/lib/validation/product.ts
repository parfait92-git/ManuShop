import * as z from "zod";

export const ProductSchema = z
  .object({
    name: z.string().trim().min(2, {
      error: "Le nom doit contenir au moins 2 caractères.",
    }),
    description: z.string().trim().min(1, {
      error: "La description est requise.",
    }),
    price: z.coerce.number().positive({
      error: "Le prix doit être supérieur à 0.",
    }),
    category: z.string().trim().min(1, {
      error: "Veuillez choisir une catégorie.",
    }),
    stock: z.coerce.number().int().min(0, {
      error: "Le stock ne peut pas être négatif.",
    }),
    stockThreshold: z.coerce.number().int().min(0, {
      error: "Le seuil d'alerte ne peut pas être négatif.",
    }),
    isPromo: z.boolean(),
    promoPrice: z.coerce.number().positive().optional(),
    promoEndDate: z.string().optional(),
  })
  .refine(
    (data) => !data.isPromo || data.promoPrice !== undefined,
    {
      error: "Indiquez un prix promotionnel.",
      path: ["promoPrice"],
    }
  )
  .refine(
    (data) =>
      !data.isPromo ||
      data.promoPrice === undefined ||
      data.promoPrice < data.price,
    {
      error: "Le prix promotionnel doit être inférieur au prix normal.",
      path: ["promoPrice"],
    }
  );

// `price`/`stock`/etc. use `z.coerce`, so the raw form values (strings from
// number inputs) differ from the parsed output — see ProductForm's `useForm`
// generics, which need both.
export type ProductFormValues = z.input<typeof ProductSchema>;
export type ProductInput = z.output<typeof ProductSchema>;

export const CategorySchema = z.object({
  name: z.string().trim().min(2, {
    error: "Le nom de la catégorie doit contenir au moins 2 caractères.",
  }),
  description: z.string().trim().min(1, {
    error: "La description est requise.",
  }),
  isActive: z.boolean(),
});

export type CategoryInput = z.infer<typeof CategorySchema>;
