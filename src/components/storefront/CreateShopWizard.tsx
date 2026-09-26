"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { useAuth } from "@/components/providers/AuthProvider";
import { ShopLogoStep } from "@/components/storefront/ShopLogoStep";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBSCRIPTION_PLANS } from "@/lib/subscriptionPlans";
import {
  CreateShopWizardSchema,
  type CreateShopWizardInput,
} from "@/lib/validation/auth";
import { authService } from "@/services/AuthService";

const STEP_LABELS = ["Infos", "Logo", "Récapitulatif", "Abonnement"] as const;
type StepIndex = 0 | 1 | 2 | 3;

const STEP_FIELDS: Record<StepIndex, (keyof CreateShopWizardInput)[]> = {
  0: ["name"],
  1: ["logo"],
  2: [],
  3: ["subscriptionPlan"],
};

function RecapRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value?: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-sm">{value || "Non renseigné"}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-sm font-medium text-primary"
      >
        Modifier
      </button>
    </div>
  );
}

/**
 * BF-79→85 : assistant "Créer ma boutique", ouvert depuis le menu compte
 * (`StorefrontHeader`) pour n'importe quel `client` connecté. Rien n'est
 * écrit avant la confirmation finale (BF-84 : annuler efface tout —
 * `reset()` suffit puisqu'aucune écriture n'a eu lieu avant).
 */
export function CreateShopWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState<StepIndex>(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateShopWizardInput>({
    resolver: zodResolver(CreateShopWizardSchema),
    defaultValues: {
      name: "",
      sector: "",
      address: "",
      phone: "",
      whatsapp: "",
      logoMode: "gallery",
      logo: "",
      subscriptionPlan: "yearly",
    },
  });

  // `useWatch` par champ (pas `watch()` en vrac) : même convention que
  // CategoryManager/ProductForm/ShopSettingsForm dans ce projet.
  const name = useWatch({ control, name: "name" });
  const sector = useWatch({ control, name: "sector" });
  const address = useWatch({ control, name: "address" });
  const phone = useWatch({ control, name: "phone" });
  const whatsapp = useWatch({ control, name: "whatsapp" });
  const logoMode = useWatch({ control, name: "logoMode" });
  const logo = useWatch({ control, name: "logo" });
  const subscriptionPlan = useWatch({ control, name: "subscriptionPlan" });

  function handleClose() {
    reset();
    setStep(0);
    setSubmitError(null);
    onOpenChange(false);
  }

  async function goNext() {
    const fields = STEP_FIELDS[step];
    if (fields.length > 0 && !(await trigger(fields))) return;
    setStep((current) => (current + 1) as StepIndex);
  }

  function goBack() {
    setStep((current) => Math.max(0, current - 1) as StepIndex);
  }

  async function onSubmit(data: CreateShopWizardInput) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await authService.createShopWithSubscription({
        name: data.name,
        sector: data.sector,
        address: data.address,
        phone: data.phone,
        whatsapp: data.whatsapp,
        logo: data.logo,
        subscriptionPlan: data.subscriptionPlan,
      });
      await refreshProfile();
      handleClose();
      router.push("/dashboard");
    } catch {
      setSubmitError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : handleClose())}
    >
      <DialogPortal className="max-w-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-primary uppercase">
              Espace gérant
            </p>
            <DialogTitle>Créer ma boutique</DialogTitle>
          </div>
          <DialogClose
            aria-label="Fermer"
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </DialogClose>
        </div>
        <DialogDescription className="sr-only">
          Assistant de création de boutique en 4 étapes : informations, logo,
          récapitulatif, abonnement.
        </DialogDescription>

        <div className="grid grid-cols-4 gap-2">
          {STEP_LABELS.map((label, index) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div
                className={`h-1 rounded-full ${
                  index <= step ? "bg-primary" : "bg-muted"
                }`}
              />
              <span
                className={`text-xs ${
                  index === step
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {index + 1}. {label}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Parlez-nous de votre activité
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ces informations permettront à vos clients d&apos;identifier
                  facilement votre commerce.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="shop-name">Nom de la boutique</Label>
                <Input
                  id="shop-name"
                  placeholder="Ex. : Chez Mado"
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shop-sector">Secteur d&apos;activité</Label>
                  <Input
                    id="shop-sector"
                    placeholder="Ex. : Mode, alimentation, beauté"
                    {...register("sector")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shop-address">Ville</Label>
                  <Input
                    id="shop-address"
                    placeholder="Ex. : Douala"
                    {...register("address")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shop-phone">Téléphone</Label>
                  <Input
                    id="shop-phone"
                    placeholder="Numéro joignable pour vos clients"
                    {...register("phone")}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="shop-whatsapp">WhatsApp</Label>
                  <Input
                    id="shop-whatsapp"
                    placeholder="Numéro utilisé pour recevoir les commandes"
                    {...register("whatsapp")}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-2">
              <ShopLogoStep
                mode={logoMode}
                onModeChange={(mode) => setValue("logoMode", mode)}
                logoUrl={logo}
                onLogoChange={(url) =>
                  setValue("logo", url, { shouldValidate: true })
                }
              />
              {errors.logo && (
                <p className="text-sm text-destructive">
                  {errors.logo.message}
                </p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Vérifiez vos informations
                </h3>
                <p className="text-sm text-muted-foreground">
                  Relisez les informations avant de choisir votre abonnement.
                </p>
              </div>
              <div className="divide-y divide-border rounded-lg border border-border">
                <RecapRow
                  label="Boutique"
                  value={name}
                  onEdit={() => setStep(0)}
                />
                <RecapRow
                  label="Secteur"
                  value={sector}
                  onEdit={() => setStep(0)}
                />
                <RecapRow
                  label="Ville"
                  value={address}
                  onEdit={() => setStep(0)}
                />
                <RecapRow
                  label="Contacts"
                  value={`Téléphone ${phone || "non renseigné"} · WhatsApp ${whatsapp || "non renseigné"}`}
                  onEdit={() => setStep(0)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Choisissez votre abonnement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Vous pourrez faire évoluer votre formule selon votre
                  activité.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const selected = subscriptionPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setValue("subscriptionPlan", plan.id)}
                      aria-pressed={selected}
                      className={`relative flex flex-col gap-1 rounded-lg border p-3 text-left ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      {plan.recommended && (
                        <span className="absolute -top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          Meilleure offre
                        </span>
                      )}
                      <span className="text-sm font-medium">{plan.label}</span>
                      <span className="text-lg font-bold">
                        {plan.priceFcfa.toLocaleString("fr-FR")} FCFA
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex justify-between gap-3 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={step === 0}
              onClick={goBack}
            >
              ← Retour
            </Button>
            {step < 3 ? (
              // `key` distinct du bouton "submit" ci-dessous : sans ça, React
              // réutilise le même nœud DOM en changeant juste son attribut
              // `type` (button -> submit) pendant le clic qui fait passer à
              // l'étape 4, et le navigateur soumet alors le formulaire tout
              // seul avant même que l'utilisateur ait vu l'étape Abonnement.
              <Button key="next" type="button" onClick={goNext}>
                {step === 2 ? "Continuer vers l'abonnement" : "Suivant"}
              </Button>
            ) : (
              <Button key="submit" type="submit" disabled={submitting}>
                {submitting ? "Création..." : "Confirmer et créer ma boutique"}
              </Button>
            )}
          </div>
        </form>
      </DialogPortal>
    </Dialog>
  );
}
