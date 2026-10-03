"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Saisie à la main du code imprimé sous le QR code (« MS-7K4PQ-9X2MB »),
 * pour qui ne peut pas le scanner. */
export function VerificationCodeForm({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(defaultValue);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const cleaned = code.trim();
        if (cleaned) router.push(`/verifier/${encodeURIComponent(cleaned)}`);
      }}
      className="flex flex-col gap-2"
    >
      <Label
        htmlFor="verification-code"
        help="Le code est imprimé sous le QR code, au bas de chaque page de la facture. Les tirets et les espaces sont facultatifs."
      >
        Code de vérification
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="verification-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="MS-XXXXX-XXXXX"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 basis-48 font-mono uppercase"
        />
        <Button type="submit" disabled={!code.trim()}>
          Vérifier
        </Button>
      </div>
    </form>
  );
}
