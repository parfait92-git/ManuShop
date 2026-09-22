"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FirebaseError } from "firebase/app";
import {
  RecaptchaVerifier,
  type ConfirmationResult,
} from "firebase/auth";
import { Eye, EyeOff, Ghost, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { FacebookIcon, GoogleIcon } from "@/components/icons/BrandIcons";
import { auth } from "@/lib/firebase";
import {
  LoginSchema,
  PhoneCodeSchema,
  PhoneLoginSchema,
  type LoginInput,
  type PhoneCodeInput,
  type PhoneLoginInput,
} from "@/lib/validation/auth";
import { authService } from "@/services/AuthService";

function authErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email ou mot de passe incorrect.";
      case "auth/too-many-requests":
        return "Trop de tentatives. Réessayez plus tard.";
      case "auth/popup-closed-by-user":
        return "Fenêtre de connexion fermée avant la fin.";
      case "auth/invalid-verification-code":
        return "Code incorrect.";
      case "auth/account-exists-with-different-credential":
        return "Un compte existe déjà avec un autre mode de connexion pour cet email.";
      default:
        return "Une erreur est survenue. Veuillez réessayer.";
    }
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}

type Tab = "email" | "phone";

export function LoginForm() {
  const [tab, setTab] = useState<Tab>("email");

  return (
    <div className="flex w-full max-w-sm flex-col gap-5">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setTab("email")}
          className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === "email"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground"
          }`}
        >
          <Mail className="size-4" />
          Email
        </button>
        <button
          type="button"
          onClick={() => setTab("phone")}
          className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors ${
            tab === "phone"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground"
          }`}
        >
          <Phone className="size-4" />
          Téléphone
        </button>
      </div>

      {tab === "email" ? <EmailLoginForm /> : <PhoneLoginForm />}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou continuer avec</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <SocialLoginButtons />

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de boutique ?{" "}
        <Link
          href="/register"
          className="text-primary underline-offset-4 hover:underline"
        >
          Créer mon espace
        </Link>
      </p>

      {/* Ancre invisible pour le reCAPTCHA de la connexion par téléphone. */}
      <div id="recaptcha-container" />
    </div>
  );
}

function EmailLoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setFormError(null);
    try {
      await authService.setRememberMe(data.rememberMe ?? false);
      await authService.login(data.email, data.password);
      router.push("/dashboard");
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Adresse email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Mot de passe</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Mot de passe oublié ?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className="pr-9"
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={
              showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" className="size-4" {...register("rememberMe")} />
        Se souvenir de moi
      </label>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Connexion..." : "Continuer"}
      </Button>
    </form>
  );
}

function PhoneLoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null
  );

  const phoneForm = useForm<PhoneLoginInput>({
    resolver: zodResolver(PhoneLoginSchema),
    defaultValues: { phone: "" },
  });
  const phoneValue = useWatch({ control: phoneForm.control, name: "phone" });
  const codeForm = useForm<PhoneCodeInput>({
    resolver: zodResolver(PhoneCodeSchema),
  });

  async function onSubmitPhone(data: PhoneLoginInput) {
    setFormError(null);
    try {
      // Recreated on every attempt rather than cached in a ref: simpler,
      // and Firebase recommends a fresh verifier after a failed attempt.
      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
      const result = await authService.startPhoneSignIn(data.phone, verifier);
      setConfirmation(result);
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  async function onSubmitCode(data: PhoneCodeInput) {
    if (!confirmation) return;
    setFormError(null);
    try {
      await authService.confirmPhoneCode(confirmation, data.code);
      router.push("/dashboard");
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  }

  if (confirmation) {
    return (
      <form
        onSubmit={codeForm.handleSubmit(onSubmitCode)}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="code">Code de vérification</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-invalid={!!codeForm.formState.errors.code}
            {...codeForm.register("code")}
          />
          {codeForm.formState.errors.code && (
            <p className="text-sm text-destructive">
              {codeForm.formState.errors.code.message}
            </p>
          )}
        </div>

        {formError && <p className="text-sm text-destructive">{formError}</p>}

        <Button
          type="submit"
          disabled={codeForm.formState.isSubmitting}
          className="w-full"
        >
          {codeForm.formState.isSubmitting ? "Vérification..." : "Valider le code"}
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={phoneForm.handleSubmit(onSubmitPhone)}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="phone">Numéro de téléphone</Label>
        <PhoneInput
          id="phone"
          value={phoneValue ?? ""}
          onChange={(value) =>
            phoneForm.setValue("phone", value, { shouldValidate: true })
          }
          aria-invalid={!!phoneForm.formState.errors.phone}
        />
        {phoneForm.formState.errors.phone && (
          <p className="text-sm text-destructive">
            {phoneForm.formState.errors.phone.message}
          </p>
        )}
      </div>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <Button
        type="submit"
        disabled={phoneForm.formState.isSubmitting}
        className="w-full"
      >
        {phoneForm.formState.isSubmitting
          ? "Envoi du code..."
          : "Recevoir le code par SMS"}
      </Button>
    </form>
  );
}

function SocialLoginButtons() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(
    name: string,
    action: () => Promise<unknown>
  ) {
    setPending(name);
    setError(null);
    try {
      await action();
      router.push("/dashboard");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!pending}
          onClick={() => handle("google", () => authService.loginWithGoogle())}
        >
          <GoogleIcon className="size-4" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!pending}
          onClick={() => handle("facebook", () => authService.loginWithFacebook())}
        >
          <FacebookIcon className="size-4 text-[#1877F2]" />
          Facebook
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!!pending}
          onClick={() => handle("anonymous", () => authService.loginAnonymously())}
        >
          <Ghost className="size-4" />
          Anonyme
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

