"use client";

import { useEffect, useState } from "react";

import { DemoPreviewBanner } from "@/components/dashboard/DemoPreviewBanner";
import { InviteSellerForm } from "@/components/dashboard/InviteSellerForm";
import { TeamList } from "@/components/dashboard/TeamList";
import { getTeamMembersByShop, mockShops } from "@/data/mockData";
import type { User } from "@/models/user/User";
import { authService } from "@/services/AuthService";

const DEMO_SHOP = mockShops.find((shop) => shop.id === "shop-mode-237")!;
const DEMO_MEMBERS = getTeamMembersByShop(DEMO_SHOP.id);

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
          <>
            <TeamList members={members} />
            {members.length === 0 && (
              <div className="mt-3 flex flex-col gap-3">
                <DemoPreviewBanner
                  title="Exemple — à quoi ressemblera votre équipe"
                  description={`Aperçu basé sur « ${DEMO_SHOP.name} », une boutique de démonstration. Invitez votre premier vendeur ci-dessus pour le remplacer.`}
                />
                <TeamList members={DEMO_MEMBERS} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
