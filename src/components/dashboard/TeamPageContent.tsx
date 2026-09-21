"use client";

import { useEffect, useState } from "react";

import { InviteSellerForm } from "@/components/dashboard/InviteSellerForm";
import { TeamList } from "@/components/dashboard/TeamList";
import type { User } from "@/models/user/User";
import { authService } from "@/services/AuthService";

export function TeamPageContent({ shopId }: { shopId: string }) {
  const [members, setMembers] = useState<User[] | null>(null);

  useEffect(() => {
    let active = true;
    authService.listTeamMembers(shopId).then((data) => {
      if (active) setMembers(data);
    });
    return () => {
      active = false;
    };
  }, [shopId]);

  function handleInvited(seller: User) {
    setMembers((current) => (current ? [...current, seller] : [seller]));
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Équipe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Invitez des vendeurs pour gérer votre boutique avec vous.
        </p>
      </div>

      <InviteSellerForm shopId={shopId} onInvited={handleInvited} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Membres</h2>
        {members === null ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : (
          <TeamList members={members} />
        )}
      </div>
    </div>
  );
}
