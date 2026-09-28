"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Globe,
  Lock,
  Mail,
  MessageCircle,
  Save,
  Settings2,
  Bell,
  Eye,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FieldHint } from "@/components/dashboard/FieldHint";
import { ShareShopLinkButton } from "@/components/dashboard/ShareShopLinkButton";
import { ShopLogoStep } from "@/components/storefront/ShopLogoStep";
import {
  CLIENT_CONTACT_METHODS,
  CLIENT_CONTACT_METHOD_LABELS,
} from "@/lib/clientContactMethods";
import {
  SOCIAL_NETWORK_LABELS,
  SOCIAL_NETWORK_URL_FIELD,
} from "@/lib/shopSocialNetworks";
import {
  ShopSettingsSchema,
  type ShopSettingsInput,
} from "@/lib/validation/auth";
import type {
  ClientContactMethod,
  PrimarySocialNetwork,
  Shop,
} from "@/models/shop/Shop";
import { activityLogService } from "@/services/ActivityLogService";
import { shopService } from "@/services/ShopService";

const NETWORK_FORMAT_HINT: Record<PrimarySocialNetwork, string> = {
  whatsapp: "idéal pour le catalogue et les statuts",
  facebook: "idéal pour les publications et les stories",
  instagram: "idéal pour le fil et les stories",
  tiktok: "pensez à une version verticale séparée pour les vidéos",
};

function defaultValuesFrom(shop: Shop): ShopSettingsInput {
  return {
    name: shop.name,
    logo: shop.logo,
    // Toujours "gallery" à l'ouverture : `Shop.logo` ne garde que l'URL
    // finale, jamais comment elle a été obtenue — l'aperçu en mode Galerie
    // fonctionne quelle que soit l'origine réelle du lien (voir
    // `ShopLogoStep`, `unoptimized` sur son `<Image>` de prévisualisation).
    logoMode: "gallery",
    description: shop.description ?? "",
    address: shop.address,
    phone: shop.phone,
    whatsapp: shop.whatsapp,
    language: (shop.language as "fr" | "en") ?? "fr",
    currency: (shop.currency as "XAF" | "EUR" | "USD") ?? "XAF",
    primarySocialNetwork: shop.primarySocialNetwork ?? "whatsapp",
    facebookUrl: shop.facebookUrl ?? "",
    instagramUrl: shop.instagramUrl ?? "",
    tiktokUrl: shop.tiktokUrl ?? "",
    whatsappBusinessUrl: shop.whatsappBusinessUrl ?? "",
    notifyOrdersByEmail: shop.notifyOrdersByEmail ?? true,
    notifyOrdersBySocial: shop.notifyOrdersBySocial ?? true,
    urgentPhoneAlerts: shop.urgentPhoneAlerts ?? true,
    contactEmail: shop.contactEmail ?? "",
    urgentPhone: shop.urgentPhone ?? "",
    clientContactMethods: shop.clientContactMethods ?? [],
    publicContactEmail: shop.publicContactEmail ?? "",
    isPublished: shop.isPublished ?? false,
  };
}

function InfoPanel() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-cyan-300">
          <Settings2 className="size-4.5" />
        </span>
        <div>
          <h3 className="font-semibold">À retenir</h3>
          <p className="text-sm text-muted-foreground">Configuration simple</p>
        </div>
      </div>
      <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground">Langue : </span>
          choisissez celle que vos clients comprennent le mieux.
        </li>
        <li>
          <span className="font-medium text-foreground">Devise : </span>
          pour le Cameroun, le FCFA est le choix recommandé.
        </li>
        <li>
          <span className="font-medium text-foreground">Réseau : </span>
          vos photos produits sont déjà au format carré, adapté à tous les
          réseaux.
        </li>
        <li>
          <span className="font-medium text-foreground">Contacts : </span>
          vérifiez les numéros avant d&apos;enregistrer.
        </li>
      </ul>
    </div>
  );
}

export function ShopSettingsForm({ shopId }: { shopId: string }) {
  const { profile } = useAuth();
  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopSettingsInput>({
    resolver: zodResolver(ShopSettingsSchema),
  });

  const logoMode = useWatch({ control, name: "logoMode" });
  const logo = useWatch({ control, name: "logo" });
  const primarySocialNetwork = useWatch({
    control,
    name: "primarySocialNetwork",
  });
  const notifyOrdersByEmail = useWatch({ control, name: "notifyOrdersByEmail" });
  const notifyOrdersBySocial = useWatch({
    control,
    name: "notifyOrdersBySocial",
  });
  const urgentPhoneAlerts = useWatch({ control, name: "urgentPhoneAlerts" });
  const phone = useWatch({ control, name: "phone" });
  const whatsapp = useWatch({ control, name: "whatsapp" });
  const urgentPhone = useWatch({ control, name: "urgentPhone" });
  const isPublished = useWatch({ control, name: "isPublished" });
  const facebookUrl = useWatch({ control, name: "facebookUrl" });
  const instagramUrl = useWatch({ control, name: "instagramUrl" });
  const clientContactMethods = useWatch({
    control,
    name: "clientContactMethods",
  });
  const publicContactEmail = useWatch({
    control,
    name: "publicContactEmail",
  });

  useEffect(() => {
    let active = true;
    shopService.getShop(shopId).then((data) => {
      if (!active) return;
      setShop(data);
      setLoading(false);
      if (data) reset(defaultValuesFrom(data));
    });
    return () => {
      active = false;
    };
  }, [shopId, reset]);

  async function onSubmit(data: ShopSettingsInput) {
    setSaved(false);
    setFormError(null);
    // `logoMode` reste purement local à ce formulaire (bascule Galerie/Lien
    // de `ShopLogoStep`) — `Shop` ne connaît que l'URL finale du logo.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { logoMode, ...shopData } = data;
    try {
      await shopService.updateProfile(shopId, shopData);
      // Le journal d'activité est secondaire : un échec ici (règles pas
      // encore déployées, réseau...) ne doit pas cacher que l'enregistrement
      // principal ci-dessus a bien réussi — capturé séparément plutôt que de
      // laisser une exception ici interrompre la fonction avant `setSaved`.
      if (profile) {
        try {
          await activityLogService.logShopSettingsUpdated({
            shopId,
            actorId: profile.id,
            actorName: profile.displayName,
          });
        } catch (err) {
          console.error(
            "ShopSettingsForm : échec de la journalisation de la mise à jour",
            err
          );
        }
      }
      setSaved(true);
    } catch {
      setFormError(
        "Échec de l'enregistrement des paramètres. Réessayez."
      );
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement...</p>;
  }

  if (!shop) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger les paramètres de la boutique.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Eye className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Visibilité</h2>
                <p className="text-sm text-muted-foreground">
                  Contrôlez si vos clients peuvent voir votre boutique (BF-88).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">
                  {isPublished ? "Boutique publiée" : "Boutique non publiée"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isPublished
                    ? "Vos clients peuvent consulter votre catalogue et commander."
                    : "Invisible pour vos clients tant qu'elle n'est pas publiée."}
                </p>
              </div>
              <Switch
                checked={isPublished}
                onCheckedChange={(checked) =>
                  setValue("isPublished", checked)
                }
                aria-label="Publier la boutique"
              />
            </div>

            {/* BF-91 : uniquement quand la boutique est réellement publiée
            au moment de l'affichage (`shop.isPublished`, pas `isPublished`
            du formulaire, qui peut refléter un changement pas encore
            enregistré) — pas de lien à partager sinon. */}
            {shop.isPublished && (
              <ShareShopLinkButton shopId={shop.id} shopName={shop.name} />
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Profil de la boutique</h2>
              <p className="text-sm text-muted-foreground">
                Nom, logo et coordonnées affichés sur votre vitrine.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nom de la boutique</Label>
              <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <ShopLogoStep
                mode={logoMode}
                onModeChange={(mode) => setValue("logoMode", mode)}
                logoUrl={logo}
                onLogoChange={(url) =>
                  setValue("logo", url, { shouldValidate: true })
                }
                hideHeading
              />
              {errors.logo && (
                <p className="text-sm text-destructive">{errors.logo.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Adresse</Label>
              <Input
                id="address"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description" className="gap-1.5">
                Description
                <FieldHint text="Présentée sur la fiche de vos produits, pour donner confiance à vos clients (qui vous êtes, ce que vous proposez)." />
              </Label>
              <textarea
                id="description"
                rows={3}
                aria-invalid={!!errors.description}
                className="flex w-full rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-input dark:bg-input/30"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Colonne unique, pas grid-cols-2 : un PhoneInput (sélecteur de
            pays + numéro) a besoin de plus de largeur qu'un champ texte
            simple ; le forcer dans une demi-colonne écrasait le numéro. */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Téléphone</Label>
                <PhoneInput
                  id="phone"
                  value={phone ?? ""}
                  onChange={(value) =>
                    setValue("phone", value, { shouldValidate: true })
                  }
                  aria-invalid={!!errors.phone}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <PhoneInput
                  id="whatsapp"
                  value={whatsapp ?? ""}
                  onChange={(value) =>
                    setValue("whatsapp", value, { shouldValidate: true })
                  }
                  aria-invalid={!!errors.whatsapp}
                />
                {errors.whatsapp && (
                  <p className="text-sm text-destructive">
                    {errors.whatsapp.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Globe className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Régionalisation</h2>
                <p className="text-sm text-muted-foreground">
                  Ces choix déterminent la langue et l&apos;affichage des
                  montants dans votre boutique.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="language" className="gap-1.5">
                  Langue de la boutique
                  <FieldHint text="La langue affichée à vos clients sur la boutique en ligne. Le changement de langue de l'interface arrive dans une prochaine version." />
                </Label>
                <Select id="language" {...register("language")}>
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="currency" className="gap-1.5">
                  Devise
                  <FieldHint text="La devise utilisée pour afficher vos prix. Pour le Cameroun, le FCFA (XAF) est recommandé." />
                </Label>
                <Select id="currency" {...register("currency")}>
                  <option value="XAF">FCFA (XAF)</option>
                  <option value="EUR">Euro (EUR)</option>
                  <option value="USD">Dollar US (USD)</option>
                </Select>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <MessageCircle className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Publication multicanale</h2>
                <p className="text-sm text-muted-foreground">
                  Le réseau choisi définit le format d&apos;image conseillé
                  pour vos articles.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="primarySocialNetwork" className="gap-1.5">
                Réseau social principal
                <FieldHint text="Le réseau où vous publiez le plus souvent vos produits. Sert uniquement à personnaliser les conseils affichés ici." />
              </Label>
              <Select
                id="primarySocialNetwork"
                {...register("primarySocialNetwork")}
              >
                {Object.entries(SOCIAL_NETWORK_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            {primarySocialNetwork && (
              <>
                <p className="rounded-lg bg-primary/5 px-4 py-3 text-sm">
                  <span className="font-semibold">Format recommandé : </span>
                  Carré 1:1 —{" "}
                  {NETWORK_FORMAT_HINT[primarySocialNetwork as PrimarySocialNetwork]}
                </p>

                {/* BF-128 : un seul champ, rebranché dynamiquement sur le
                champ Firestore correspondant au réseau choisi ci-dessus
                (voir `lib/shopSocialNetworks.ts`) — affiché sur la fiche
                produit plutôt que de montrer les 4 liens en permanence. */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="primarySocialNetworkUrl" className="gap-1.5">
                    Lien de votre page {SOCIAL_NETWORK_LABELS[primarySocialNetwork as PrimarySocialNetwork]}
                    <FieldHint text="Affiché sur la fiche de vos produits, pour que vos clients puissent vous retrouver sur ce réseau." />
                  </Label>
                  <Input
                    id="primarySocialNetworkUrl"
                    placeholder="https://..."
                    aria-invalid={
                      !!errors[SOCIAL_NETWORK_URL_FIELD[primarySocialNetwork as PrimarySocialNetwork]]
                    }
                    {...register(
                      SOCIAL_NETWORK_URL_FIELD[primarySocialNetwork as PrimarySocialNetwork]
                    )}
                  />
                  {errors[SOCIAL_NETWORK_URL_FIELD[primarySocialNetwork as PrimarySocialNetwork]] && (
                    <p className="text-sm text-destructive">
                      {errors[SOCIAL_NETWORK_URL_FIELD[primarySocialNetwork as PrimarySocialNetwork]]?.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Moyens de contact client</h2>
                <p className="text-sm text-muted-foreground">
                  Choisissez comment vos clients peuvent vous contacter,
                  affiché sur la fiche de vos produits (BF-105).
                </p>
              </div>
            </div>

            {!shop.premiumFeatures?.includes("advancedContact") ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-8 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Lock className="size-4.5" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Réservé aux boutiques disposant du privilège premium
                  correspondant.
                </p>
              </div>
            ) : (
              <>
                {CLIENT_CONTACT_METHODS.map((method) => {
                  const hasValue =
                    method === "email"
                      ? !!publicContactEmail
                      : method === "whatsapp"
                        ? !!whatsapp
                        : method === "facebook"
                          ? !!facebookUrl
                          : !!instagramUrl;
                  const enabled =
                    clientContactMethods?.includes(method) ?? false;

                  return (
                    <div
                      key={method}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {CLIENT_CONTACT_METHOD_LABELS[method]}
                        </p>
                        {!hasValue && (
                          <p className="text-sm text-muted-foreground">
                            {method === "email"
                              ? "Renseignez l'e-mail ci-dessous pour activer ce canal."
                              : method === "whatsapp"
                                ? "Renseignez le numéro WhatsApp ci-dessus pour activer ce canal."
                                : "Renseignez le lien ci-dessus (Publication multicanale) pour activer ce canal."}
                          </p>
                        )}
                      </div>
                      <Switch
                        checked={enabled}
                        disabled={!hasValue}
                        onCheckedChange={(checked) => {
                          const current = clientContactMethods ?? [];
                          setValue(
                            "clientContactMethods",
                            checked
                              ? [...current, method]
                              : current.filter(
                                  (m: ClientContactMethod) => m !== method
                                ),
                            { shouldValidate: true }
                          );
                        }}
                        aria-label={`${enabled ? "Désactiver" : "Activer"} le contact par ${CLIENT_CONTACT_METHOD_LABELS[method]}`}
                      />
                    </div>
                  );
                })}

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="publicContactEmail">
                    E-mail affiché aux clients
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="publicContactEmail"
                      type="email"
                      className="pl-9"
                      aria-invalid={!!errors.publicContactEmail}
                      {...register("publicContactEmail")}
                    />
                  </div>
                  {errors.publicContactEmail && (
                    <p className="text-sm text-destructive">
                      {errors.publicContactEmail.message}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="size-4.5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">
                  Notifications de commande
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choisissez comment être prévenu lorsqu&apos;une commande
                  arrive depuis vos réseaux.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">
                  Recevoir les commandes par e-mail
                </p>
                <p className="text-sm text-muted-foreground">
                  Un résumé de chaque commande sera envoyé à votre adresse de
                  contact.
                </p>
              </div>
              <Switch
                checked={notifyOrdersByEmail}
                onCheckedChange={(checked) =>
                  setValue("notifyOrdersByEmail", checked)
                }
                aria-label="Recevoir les commandes par e-mail"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">
                  Recevoir les commandes des réseaux sociaux
                </p>
                <p className="text-sm text-muted-foreground">
                  Alerte pour les commandes initiées depuis WhatsApp, Facebook,
                  Instagram ou TikTok.
                </p>
              </div>
              <Switch
                checked={notifyOrdersBySocial}
                onCheckedChange={(checked) =>
                  setValue("notifyOrdersBySocial", checked)
                }
                aria-label="Recevoir les commandes des réseaux sociaux"
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">
                  Activer les alertes urgentes par téléphone
                </p>
                <p className="text-sm text-muted-foreground">
                  Utilise le numéro ci-dessous pour rediriger les clients en
                  cas de commande urgente.
                </p>
              </div>
              <Switch
                checked={urgentPhoneAlerts}
                onCheckedChange={(checked) =>
                  setValue("urgentPhoneAlerts", checked)
                }
                aria-label="Activer les alertes urgentes par téléphone"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Ces préférences seront utilisées dès que le suivi des commandes
              (Module 4) sera disponible — elles sont déjà enregistrées.
            </p>
          </section>

          <section className="flex flex-col gap-4 rounded-xl border border-border bg-background p-4 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Contacts de commande</h2>
              <p className="text-sm text-muted-foreground">
                Ces coordonnées seront utilisées pour le suivi et la
                redirection des clients.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contactEmail" className="gap-1.5">
                  Contact e-mail
                  <FieldHint text="L'adresse email qui recevra le résumé des commandes si l'option est activée ci-dessus." />
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="contactEmail"
                    type="email"
                    className="pl-9"
                    aria-invalid={!!errors.contactEmail}
                    {...register("contactEmail")}
                  />
                </div>
                {errors.contactEmail && (
                  <p className="text-sm text-destructive">
                    {errors.contactEmail.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="urgentPhone" className="gap-1.5">
                  Téléphone urgent
                  <FieldHint text="Le numéro utilisé pour rediriger un client en cas de commande urgente, si l'option est activée ci-dessus." />
                </Label>
                <PhoneInput
                  id="urgentPhone"
                  value={urgentPhone ?? ""}
                  onChange={(value) => setValue("urgentPhone", value)}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <InfoPanel />
          <Button type="submit" disabled={isSubmitting} className="w-full gap-1.5">
            <Save className="size-4" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer les paramètres"}
          </Button>
          {saved && (
            <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
              Paramètres enregistrés.
            </p>
          )}
          {formError && (
            <p className="text-center text-sm text-destructive">{formError}</p>
          )}
        </div>
      </div>
    </form>
  );
}
