import { Timestamp } from "firebase/firestore";

import { auth } from "@/lib/firebase";
import type { PremiumFeatureKey } from "@/lib/premiumFeatures";
import type { User } from "@/models/user/User";
import { platformAdminRepository } from "@/repositories/PlatformAdminRepository";
import type { IPlatformAdminRepository } from "@/repositories/interfaces/IPlatformAdminRepository";
import {
  grantAdminAction,
  listMerchantsAction,
  revokeAdminAction,
  searchUsersAction,
  setShopPremiumFeatureAction,
  type MerchantDto,
  type SearchedUserDto,
} from "@/server/actions/platformAdminActions";

function fromSearchedUserDto(dto: SearchedUserDto): User {
  return {
    ...dto,
    createdAt: Timestamp.fromDate(new Date(dto.createdAt)),
  };
}

export class PlatformAdminService {
  constructor(
    private readonly platformAdmins: IPlatformAdminRepository = platformAdminRepository
  ) {}

  /** Un compte sans email ne peut jamais être Super Admin — la collection
   * `platformAdmins` est indexée par email. Lecture
   * directe côté client (pas via le serveur) : déjà étroitement scopée par
   * la règle Firestore (`request.auth.token.email == email`), pas une
   * mutation — passer par le serveur n'ajouterait que de la latence à
   * chaque changement d'état d'auth dans `AuthProvider`, sans bénéfice. */
  isSuperAdmin(email: string | null | undefined): Promise<boolean> {
    if (!email) return Promise.resolve(false);
    return this.platformAdmins.exists(email);
  }

  /** Recherche par pseudo, email ou téléphone (BF-68). Le filtrage reste en
   * mémoire (pas de moteur de recherche dédié tant que la base
   * d'utilisateurs reste petite), mais s'exécute désormais côté serveur
   * (`searchUsersAction`) : lister tous les comptes de la plateforme est un
   * privilège Super Admin, donc ça ne doit plus dépendre uniquement d'une
   * règle Firestore pour être refusé aux autres appelants. */
  async searchUsers(term: string): Promise<User[]> {
    const dtos = await searchUsersAction(await this.getCallerIdToken(), term);
    return dtos.map(fromSearchedUserDto);
  }

  /** Attribution manuelle du rôle admin (BF-68), indépendante d'un
   * abonnement (`adminSource: "manual"`) — pas de date d'expiration, valable
   * jusqu'à révocation explicite. Passe par une Server Action
   * (`grantAdminAction`) qui revérifie le privilège Super Admin en code via
   * `firebase-admin`, plutôt que de dépendre uniquement de `firestore.rules`
   * pour empêcher une écriture non autorisée. */
  async grantAdmin(userId: string): Promise<void> {
    await grantAdminAction(await this.getCallerIdToken(), userId);
  }

  /** Révoque le rôle admin, quelle qu'en soit l'origine (BF-68/BF-70). Les
   * champs `adminSource`/`subscriptionPlan`/`subscriptionExpiresAt` sont
   * laissés tels quels : ils seront de toute façon écrasés à la prochaine
   * attribution, et ne sont jamais lus pour un compte non-admin. */
  async revokeAdmin(userId: string): Promise<void> {
    await revokeAdminAction(await this.getCallerIdToken(), userId);
  }

  /** BF-117/118 : commerçants déduits des boutiques (groupées par
   * propriétaire), pas d'une liste d'utilisateurs filtrée par rôle. */
  async listMerchants(): Promise<MerchantDto[]> {
    return listMerchantsAction(await this.getCallerIdToken());
  }

  /** BF-119 : privilège premium par boutique, indépendant de l'abonnement. */
  async setShopPremiumFeature(
    shopId: string,
    feature: PremiumFeatureKey | string,
    enabled: boolean
  ): Promise<void> {
    await setShopPremiumFeatureAction(
      await this.getCallerIdToken(),
      shopId,
      feature,
      enabled
    );
  }

  private async getCallerIdToken(): Promise<string> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      throw new Error("Vous devez être connecté.");
    }
    return token;
  }
}

export const platformAdminService = new PlatformAdminService();
